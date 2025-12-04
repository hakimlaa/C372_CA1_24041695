const User = require('../models/UserModel');

//Render register form
exports.renderRegister = (req, res) => {
    res.render('register', { messages: req.flash('error'), formData: req.flash('formData')[0] });
};

//Handle registration
exports.registerUser = (req, res) => {
    const { username, email, password, address, contact, role } = req.body;
    if (!username || !email || !password || !address || !contact || !role) {
        req.flash('error', 'All fields are required.');
        req.flash('formData', req.body);
        return res.redirect('/register');
    }

    if (password.length < 6) {
        req.flash('error', 'Password must be at least 6 characters long.');
        req.flash('formData', req.body);
        return res.redirect('/register');
    }

    User.add(username, email, password, address, contact, role, (err) => {
        if (err) throw err;
        req.flash('success', 'Registration successful! Please log in.');
        res.redirect('/login');
    });
};

//Render login form
exports.renderLogin = (req, res) => {
    res.render('login', { messages: req.flash('success'), errors: req.flash('error') });
};

//Handle login
exports.loginUser = (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        req.flash('error', 'All fields are required.');
        return res.redirect('/login');
    }

    User.getByCredentials(email, password, (err, results) => {
        if (err) throw err;
        if (results.length > 0) {
            req.session.user = {
    user_id: results[0].id,          // your users table uses "id"
    username: results[0].username,
    email: results[0].email,
    role: results[0].role
};

            req.flash('success', 'Login successful!');
            if (req.session.user.role === 'admin') res.redirect('/inventory');
            else res.redirect('/shopping');
        } else {
            req.flash('error', 'Invalid email or password.');
            res.redirect('/login');
        }
    });
};

//Handle logout
exports.logoutUser = (req, res) => {
    req.session.destroy();
    res.redirect('/');
};

//Fix for “argument handler must be a function”
module.exports = exports;
