const { renderMenu } = require('./renderMenu');

async function handleBrowse(ctx) {
  // استدعاء المنيو الموحد لأول مرة (بدون parentId يعني Root وبدون edit يعني رسالة جديدة)
  return renderMenu(ctx, null, false);
}

module.exports = {
  handleBrowse
};