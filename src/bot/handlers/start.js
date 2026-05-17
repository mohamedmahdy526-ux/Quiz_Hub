async function handleStart(ctx) {
  const firstName =
    ctx.from?.first_name || 'يا بطل';

  await ctx.reply(
    `أهلاً بك يا ${firstName} 🚀\n\n` +
    `مرحبا بك في Quiz Platform`
  );
}

module.exports = {
  handleStart
};