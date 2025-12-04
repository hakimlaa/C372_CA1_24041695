const Order = require('../models/OrderModel');

exports.renderOrderHistory = (req, res) => {
    const user = req.session.user;
    if (!user) return res.redirect('/login');

    const userId = user.user_id;  // <-- adjust to match your users table

    Order.getOrdersByUser(userId, (error, results) => {
        if (error) throw error;

        res.render("orderHistory", {
            user: user,
            orders: results
        });
    });
};
