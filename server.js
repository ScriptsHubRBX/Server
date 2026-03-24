local HttpService = game:GetService("HttpService")

-- ДОБАВЬ свой anon key (найди в Supabase Dashboard → Project Settings → API)
local SUPABASE_URL = "https://lrjxzgurwvszrkzmjnla.supabase.co"
local SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIs..." -- твой anon ключ

local BASE_URL = SUPABASE_URL .. "/functions/v1/tiktok-api"
local username = "lesteuteudu62"

-- Заголовки для авторизации
local headers = {
	["Authorization"] = "Bearer " .. SUPABASE_KEY,
	["Content-Type"] = "application/json"
}

-- Подключение к стриму
local function connectToStream()
	local ok, result = pcall(function()
		local url = BASE_URL .. "/api/tiktok/set-stream?username=" .. HttpService:UrlEncode(username)
		return HttpService:GetAsync(url, false, headers)
	end)
	
	if ok then
		print("✅ Подключён к @" .. username)
		return true
	else
		warn("❌ Ошибка: " .. tostring(result))
		return false
	end
end

-- Получение сообщений
local function getMessages()
	local success, response = pcall(function()
		return HttpService:GetAsync(BASE_URL .. "/api/tiktok/messages", false, headers)
	end)
	
	if success then
		local parseOk, data = pcall(HttpService.JSONDecode, HttpService, response)
		return parseOk and data
	end
	return nil
end

-- Главный цикл
if connectToStream() then
	local lastCount = 0
	while true do
		local data = getMessages()
		if data and data.messages then
			for i = lastCount + 1, #data.messages do
				local msg = data.messages[i]
				print("💬 " .. tostring(msg.user) .. ": " .. tostring(msg.text))
			end
			lastCount = #data.messages
		end
		task.wait(2)
	end
end
