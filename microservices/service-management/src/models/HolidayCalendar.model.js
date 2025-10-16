const mongoose = require('mongoose');

const HolidayCalendarSchema = new mongoose.Schema({
  name: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('HolidayCalendar', HolidayCalendarSchema);