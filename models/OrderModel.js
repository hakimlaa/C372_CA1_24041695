const db = require('../db');

const Order = {};

Order.getOrdersByUser = (userId, callback) => {
    const sql = `
        SELECT 
            order_id AS orderId,
            productName,
            quantity,
            price
        FROM orders
        WHERE user_id = ?
        ORDER BY order_id DESC
    `;
    db.query(sql, [userId], callback);
};

module.exports = Order;
