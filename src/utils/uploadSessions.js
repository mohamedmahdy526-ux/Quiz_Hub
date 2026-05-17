const uploadSessions = {};

function setUploadSession(userId, data) {
  uploadSessions[userId] = data;
}

function getUploadSession(userId) {
  return uploadSessions[userId];
}

function clearUploadSession(userId) {
  delete uploadSessions[userId];
}

module.exports = {
  setUploadSession,
  getUploadSession,
  clearUploadSession
};