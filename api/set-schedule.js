const webpush = require('web-push');

const vapidKeys = {
  publicKey: 'BC5kR26ZaNi22hxjiOjGJb4VRf537r-ZEL3yhBfMpphjwmlAAYnLr3AoWHuIVfOV9sAyQlEF5LhT6yO9aYkXu-E',
  privateKey: 'uMA636Bv32gz5tVt4mXCOkv6ObNc3tTHfsN_mMiw9ic'
};
webpush.setVapidDetails('mailto:vod01052003@gmail.com', vapidKeys.publicKey, vapidKeys.privateKey);

let subscriptions = []; // Lưu ý: Để lưu chung, có thể dùng database thay bộ nhớ
let schedule = [];
let intervalId;

module.exports = (req, res) => {
  if (req.method === 'POST') {
    schedule = req.body.schedule;
    res.status(200).json({ message: 'Schedule set' });
    checkAndSendNotifications();
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
};

function checkAndSendNotifications() {
  if (intervalId) clearInterval(intervalId);
  intervalId = setInterval(() => {
    const now = new Date().getTime();
    schedule.forEach(item => {
      const fiveMinutesBefore = item.time - 5 * 60 * 1000;
      if (now >= fiveMinutesBefore && now < item.time) {
        subscriptions.forEach(subscription => {
          webpush.sendNotification(subscription, JSON.stringify({
            title: 'Nhắc nhở học tập',
            body: `Bạn sắp bắt đầu: ${item.name} lúc ${new Date(item.time).toLocaleTimeString()}`,
            url: '/'
          })).catch(err => console.error('Lỗi gửi thông báo:', err));
        });
      }
    });
  }, 60000); // Kiểm tra mỗi phút
}