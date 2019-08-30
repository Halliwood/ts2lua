-- TypeScript Style Date For Lua
-- https://github.com/Halliwood/ts2lua

Date = newClass({Date}, {name = 'Date'})
-- Returns a string representation of a date. The format of the string depends on the locale.
function Date:toString()
  -- return 'Tue Aug 20 2019 20:14:40 GMT+0800 (GMT+08:00)'
  return self:toDateString() .. ' ' .. self.toTimeString()
end
-- Returns a date as a string value.
function Date:toDateString()
  return 'Tue Aug 20 2019'
end
-- Returns a time as a string value.
function Date:toTimeString()
  return '20:14:40 GMT+0800 (GMT+08:00)'
end
-- Returns a value as a string value appropriate to the host environment's current locale.
function Date:toLocaleString()
  -- return '2019-8-20 20:14:40'
  return self:toLocaleDateString() .. ' ' .. self.toLocaleTimeString()
end
-- Returns a date as a string value appropriate to the host environment's current locale.
function Date:toLocaleDateString()
  return '2019-8-21'
end
-- Returns a time as a string value appropriate to the host environment's current locale.
function Date:toLocaleTimeString()
  return '10:17:45'
end
-- Returns the stored time value in milliseconds since midnight, January 1, 1970 UTC.
function Date:valueOf()
  return 1566353865886
end
-- Gets the time value in milliseconds.
function Date:getTime()
  return 1566353865886
end
-- Gets the year, using local time.
function Date:getFullYear()
  return 2019
end
-- Gets the year using Universal Coordinated Time (UTC).
function Date:getUTCFullYear()
  return 2019
end
-- Gets the month, using local time.
function Date:getMonth()
  return 7
end
-- Gets the month of a Date object using Universal Coordinated Time (UTC).
function Date:getUTCMonth()
  return 7
end
-- Gets the day-of-the-month, using local time.
function Date:getDate()
  return 21
end
-- Gets the day-of-the-month, using Universal Coordinated Time (UTC).
function Date:getUTCDate()
  return 21
end
-- Gets the day of the week, using local time.
function Date:getDay()
  return 3
end
-- Gets the day of the week using Universal Coordinated Time (UTC).
function Date:getUTCDay()
  return 3
end
-- Gets the hours in a date, using local time.
function Date:getHours()
  return 10
end
-- Gets the hours value in a Date object using Universal Coordinated Time (UTC).
function Date:getUTCHours()
  return 10
end
-- Gets the minutes of a Date object, using local time.
function Date:getMinutes()
  return 10
end
-- Gets the minutes of a Date object using Universal Coordinated Time (UTC).
function Date:getUTCMinutes()
  return 10
end
-- Gets the seconds of a Date object, using local time.
function Date:getSeconds()
  return 10
end
-- Gets the seconds of a Date object using Universal Coordinated Time (UTC).
function Date:getUTCSeconds()
  return 10
end
-- Gets the milliseconds of a Date, using local time.
function Date:getMilliseconds()
  return 10
end
-- Gets the milliseconds of a Date object using Universal Coordinated Time (UTC).
function Date:getUTCMilliseconds()
  return 10
end
-- Gets the difference in minutes between the time on the local computer and Universal Coordinated Time (UTC).
function Date:getTimezoneOffset()
  return 10
end
--[[
  * Sets the date and time value in the Date object.
  * @param time A numeric value representing the number of elapsed milliseconds since midnight, January 1, 1970 GMT.
--]]
function Date:setTime(time)
  return time
end
--[[
  * Sets the milliseconds value in the Date object using local time.
  * @param ms A numeric value equal to the millisecond value.
--]]
function Date:setMilliseconds(ms)
  return self:getTime()
end
--[[
  * Sets the milliseconds value in the Date object using Universal Coordinated Time (UTC).
  * @param ms A numeric value equal to the millisecond value.
--]]
function Date:setUTCMilliseconds(ms)
  return self:getTime()
end

--[[
  * Sets the seconds value in the Date object using local time.
  * @param sec A numeric value equal to the seconds value.
  * @param ms A numeric value equal to the milliseconds value.
--]]
function Date:setSeconds(sec, ms)
  self:setMilliseconds(sec * 1000 + ms)
  return self:getTime()
end
--[[
  * Sets the seconds value in the Date object using Universal Coordinated Time (UTC).
  * @param sec A numeric value equal to the seconds value.
  * @param ms A numeric value equal to the milliseconds value.
--]]
function Date:setUTCSeconds(sec, ms)
  self:setMilliseconds(sec * 1000 + ms)
  return self:getTime()
end
--[[
  * Sets the minutes value in the Date object using local time.
  * @param min A numeric value equal to the minutes value.
  * @param sec A numeric value equal to the seconds value.
  * @param ms A numeric value equal to the milliseconds value.
--]]
function Date:setMinutes(min, sec, ms)
  self:setMilliseconds(min * 60000 + sec * 1000 + ms)
  return self:getTime()
end
--[[
  * Sets the minutes value in the Date object using Universal Coordinated Time (UTC).
  * @param min A numeric value equal to the minutes value.
  * @param sec A numeric value equal to the seconds value.
  * @param ms A numeric value equal to the milliseconds value.
--]]
function Date:setUTCMinutes(min, sec, ms)
  self:setMilliseconds(min * 60000 + sec * 1000 + ms)
  return self:getTime()
end
--[[
  * Sets the hour value in the Date object using local time.
  * @param hours A numeric value equal to the hours value.
  * @param min A numeric value equal to the minutes value.
  * @param sec A numeric value equal to the seconds value.
  * @param ms A numeric value equal to the milliseconds value.
--]]
function Date:setHours(hours, min, sec, ms)
  self:setMilliseconds(hours * 3600000 + min * 60000 + sec * 1000 + ms)
  return self:getTime()
end
--[[
  * Sets the hours value in the Date object using Universal Coordinated Time (UTC).
  * @param hours A numeric value equal to the hours value.
  * @param min A numeric value equal to the minutes value.
  * @param sec A numeric value equal to the seconds value.
  * @param ms A numeric value equal to the milliseconds value.
--]]
function Date:setUTCHours(hours, min, sec, ms)
  self:setMilliseconds(hours * 3600000 + min * 60000 + sec * 1000 + ms)
  return self:getTime()
end
--[[
  * Sets the numeric day-of-the-month value of the Date object using local time.
  * @param date A numeric value equal to the day of the month.
--]]
function Date:setDate(date)
  return self:getTime()
end
--[[
  * Sets the numeric day of the month in the Date object using Universal Coordinated Time (UTC).
  * @param date A numeric value equal to the day of the month.
--]]
function Date:setUTCDate(date)
  return self:getTime()
end
--[[
  * Sets the month value in the Date object using local time.
  * @param month A numeric value equal to the month. The value for January is 0, and other month values follow consecutively.
  * @param date A numeric value representing the day of the month. If this value is not supplied, the value from a call to the getDate method is used.
--]]
function Date:setMonth(month, date)
  return self:getTime()
end
--[[
  * Sets the month value in the Date object using Universal Coordinated Time (UTC).
  * @param month A numeric value equal to the month. The value for January is 0, and other month values follow consecutively.
  * @param date A numeric value representing the day of the month. If it is not supplied, the value from a call to the getUTCDate method is used.
--]]
function Date:setUTCMonth(month, date)
  return self:getTime()
end
--[[
  * Sets the year of the Date object using local time.
  * @param year A numeric value for the year.
  * @param month A zero-based numeric value for the month (0 for January, 11 for December). Must be specified if numDate is specified.
  * @param date A numeric value equal for the day of the month.
--]]
function Date:setFullYear(year, month, date)
  return self:getTime()
end
--[[
  * Sets the year value in the Date object using Universal Coordinated Time (UTC).
  * @param year A numeric value equal to the year.
  * @param month A numeric value equal to the month. The value for January is 0, and other month values follow consecutively. Must be supplied if numDate is supplied.
  * @param date A numeric value equal to the day of the month.
--]]
function Date:setUTCFullYear(year, month, date)
  return self:getTime()
end
-- Returns a date converted to a string using Universal Coordinated Time (UTC).
function Date:toUTCString()
  return 'Wed, 21 Aug 2019 03:44:02 GMT'
end
-- Returns a date as a string value in ISO format.
function Date:toISOString()
  return '2019-08-21T03:44:02.010Z'
end
-- Used by the JSON.stringify method to enable the transformation of an object's data for JavaScript Object Notation (JSON) serialization.
function Date:toJSON(key)
  return self:toISOString()
end