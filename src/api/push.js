const webpush = require('web-push');

const vapidKeys = {
  publicKey: 'BC5kR26ZaNi22hxjiOjGJb4VRf537r-ZEL3yhBfMpphjwmlAAYnLr3AoWHuIVfOV9sAyQlEF5LhT6yO9aYkXu-E',
  privateKey: 'uMA636Bv32gz5tVt4mXCOkv6ObNc3tTHfsN_mMiw9ic'
};
webpush.setVapidDetails('mailto:vod01052003@gmail.com', vapidKeys.publicKey, vapidKeys.privateKey);

let subscriptions = [];
let schedule = [];

module.exports = (req, res) => {
  if (req.method === 'POST') {
    if (req.url === '/subscribe') {
      subscriptions.push(req.body);
      res.status(201).json({ message: 'Subscribed' });
    } else if (req.url === '/set-schedule') {
      schedule = req.body.schedule;
      res.status(200).json({ message: 'Schedule set' });
      checkAndSendNotifications();
    }
  }
};

function checkAndSendNotifications() {
  setInterval(() => {
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