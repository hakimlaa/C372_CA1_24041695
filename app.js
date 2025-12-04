const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const multer = require('multer');
const path = require('path');
const app = express();

//Import controllers
const ProductController = require('./controllers/ProductController');
const UserController = require('./controllers/UserController');
const CartController = require('./controllers/CartController')
const OrderController = require('./controllers/OrderController');  // <-- added

//Set up multer for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/images'),
    filename: (req, file, cb) => cb(null, file.originalname)
});
const upload = multer({ storage });

//View engine + middleware
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));

//Sessions & flash messages
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 } // 1 week
}));
app.use(flash());

//Middleware to check authentication
const checkAuthenticated = (req, res, next) => {
    if (req.session.user) return next();
    req.flash('error', 'Please log in to view this page.');
    res.redirect('/login');
};

//Middleware to check admin
const checkAdmin = (req, res, next) => {
    if (req.session.user.role === 'admin') return next();
    req.flash('error', 'Access denied.');
    res.redirect('/shopping');
};

//Routes
app.get('/', (req, res) => res.render('index', { user: req.session.user }));

// ---- USER ROUTES ----
app.get('/register', UserController.renderRegister);
app.post('/register', UserController.registerUser);
app.get('/login', UserController.renderLogin);
app.post('/login', UserController.loginUser);
app.get('/logout', UserController.logoutUser);

// ---- PRODUCT ROUTES ----
app.get('/inventory', checkAuthenticated, checkAdmin, ProductController.getAllProducts);
app.get('/product/:id', checkAuthenticated, ProductController.getProductById);
app.get('/addProduct', checkAuthenticated, checkAdmin, ProductController.renderAddForm);
app.post('/addProduct', checkAuthenticated, checkAdmin, upload.single('image'), ProductController.addProduct);
app.get('/updateProduct/:id', checkAuthenticated, checkAdmin, ProductController.renderUpdateForm);
app.post('/updateProduct/:id', checkAuthenticated, checkAdmin, upload.single('image'), ProductController.updateProduct);
app.get('/deleteProduct/:id', checkAuthenticated, checkAdmin, ProductController.deleteProduct);
app.get('/cart', checkAuthenticated, CartController.viewCart);
app.post('/add-to-cart/:id', checkAuthenticated, CartController.addToCart);
app.post('/checkout', checkAuthenticated, CartController.checkout);
app.post('/cart/remove/:id', CartController.removeItem);
app.post('/cart/clear', CartController.clearCart);
app.post('/download-pdf', checkAuthenticated, CartController.generatePDF);
app.get('/orders', checkAuthenticated, OrderController.renderOrderHistory);








// ---- SHOPPING PAGE ----
app.get('/shopping', checkAuthenticated, ProductController.renderShoppingPage);

//Server start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
