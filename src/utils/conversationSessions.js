const sessions = {};

function setSession(userId, data) {
  sessions[userId] = data;
}

function getSession(userId) {
  return sessions[userId];
}

function clearSession(userId) {
  delete sessions[userId];
}

module.exports = {
  setSession,
  getSession,
  clearSession
};