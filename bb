local HttpService = game:GetService("HttpService")
local SAVE_FILE = "jailbreak_hyper-saves.json"

local defaultSaves = {
	tp = nil,
}

local function loadSaves()
	if not (readfile and writefile) then return defaultSaves end
	local ok, data = pcall(readfile, SAVE_FILE)
	if not ok or not data or data:gsub("%s", "") == "" then
		pcall(writefile, SAVE_FILE, HttpService:JSONEncode(defaultSaves))
		return defaultSaves
	end
	local ok2, decoded = pcall(HttpService.JSONDecode, HttpService, data)
	if not ok2 then
		pcall(writefile, SAVE_FILE, HttpService:JSONEncode(defaultSaves))
		return defaultSaves
	end
	for k, v in pairs(defaultSaves) do
		if decoded[k] == nil then decoded[k] = v end
	end
	return decoded
end

local function saveCurrent()
	if not writefile then return end
	local current = {
		tp = _G.tp,
	}
	pcall(writefile, SAVE_FILE, HttpService:JSONEncode(current))
end

local saves = loadSaves()
_G.tp = saves.tp

local function changelogsteleport(name)
	local TOKEN = "zd-cL3QB4d-oc2ZFN9Y94PSX1ArjZyfABFvvo_u8m5c"
	local ROBBERY = name


	local TeleportService = game:GetService("TeleportService")
	local Players = game:GetService("Players")
	local HttpService = game:GetService("HttpService")
	local PLACE_ID = 606849621

	local WS_URL = "wss://inventories.jailbreakchangelogs.com/tracker?token=" .. TOKEN

	local done = false

	local ws = WebSocket.connect(WS_URL)

	ws.OnMessage:Connect(function(raw)
		if done then return end

		local ok, msg = pcall(HttpService.JSONDecode, HttpService, raw)
		if not ok or type(msg) ~= "table" then return end
		if msg.action ~= "recent_robberies" then return end
		if type(msg.data) ~= "table" or #msg.data == 0 then
			warn("[Tracker] Данных нет, подожди немного...")
			return
		end

		local best = nil
		for _, r in ipairs(msg.data) do
			if r.marker_name == ROBBERY then
				if not best or (r.timestamp or 0) > (best.timestamp or 0) then
					best = r
				end
			end
		end

		if not best then
			warn("[Tracker] Ограбление '" .. ROBBERY .. "' сейчас не идёт ни на одном сервере")
			ws:Close()
			return
		end

		local jobId = (best.server and best.server.job_id) or best.job_id

		if not jobId or jobId == "" then
			warn("[Tracker] Job ID не найден")
			ws:Close()
			return
		end

		done = true
		ws:Close()

		print("[Tracker] Найден сервер: " .. jobId)
		print("[Tracker] Телепортирую...")

		if name ~= "test" then
			TeleportService:TeleportToPlaceInstance(PLACE_ID, jobId, Players.LocalPlayer)
		else	
			is = true
		end
	end)

	ws.OnClose:Connect(function()
		if not done then
			--warn("[Tracker] Соединение закрылось без результата. Проверь токен.")
		end
	end)

	ws:Send(HttpService:JSONEncode({ action = "ping" }))
	print("[Tracker] Подключился, жду данные...")
end
local function jbteleport(name)
	local H,T=game:GetService("HttpService"),game:GetService("TeleportService")
	local function req(u) return(syn and syn.request or request)({Url=u,Method="GET"}) end
	local d=H:JSONDecode(req("https://api.jbvalues.com/v1/robbery-state").Body)
	local best,bt=nil,math.huge
	for _,s in ipairs(d.servers) do
		if s.robberyData and s.robberyData[name] then
			local t=s.serverTime or 0
			if t<bt then bt=t;best=s.serverId end
		end
	end
	if best then print("🚀 "..best);T:TeleportToPlaceInstance(606849621,best) end
end
