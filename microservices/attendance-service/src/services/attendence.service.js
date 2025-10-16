const Attendance = require('../models/Attendance.model');
const geoUtils = require('../utils/geoUtils');

class AttendanceService {
  async markAttendance(employeeId, storeCoords, userCoords, selfieUrl) {
    const isInsideGeofence = geoUtils.isWithinRadius(storeCoords, userCoords, 100); // 100m radius
    if (!isInsideGeofence) throw new Error('You are outside store geofence');

    const attendance = await Attendance.create({
      employee: employeeId,
      selfieUrl,
      location: userCoords,
      status: 'present',
      markedAt: new Date()
    });

    return attendance;
  }

  async getAttendance(employeeId, startDate, endDate) {
    return Attendance.find({
      employee: employeeId,
      markedAt: { $gte: startDate, $lte: endDate }
    }).sort({ markedAt: -1 });
  }
}

module.exports = new AttendanceService();
