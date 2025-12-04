const PDFDocument = require('pdfkit');
const db = require('../db');
const path = require('path');

module.exports = {

   // ---------------- VIEW CART ----------------
viewCart: (req, res) => {
    const userId = req.session.user.user_id;

    const sql = `
        SELECT 
            c.cart_id,
            p.productName AS product_name,
            p.image,
            p.price,
            c.quantity
        FROM cart c
        JOIN products p ON c.product_id = p.id
        WHERE c.user_id = ?
    `;

    db.query(sql, [userId], (err, result) => {
        if (err) throw err;

        let total = 0;
        result.forEach(item => {
            total += item.price * item.quantity;
        });

        // ⭐ send error message from session
        const errorMessage = req.session.error;
        req.session.error = null;  // clear after showing it once

        res.render('cart', {
            cart: result,
            user: req.session.user,
            total: total,
            error: errorMessage
        });
    });
},

    // ---------------- ADD TO CART ----------------
addToCart: (req, res) => {
    const productId = req.params.id;
    const addQty = parseInt(req.body.quantity);
    const userId = req.session.user.user_id;

    // 1. Get product stock from database
    const getProductSql = `SELECT quantity FROM products WHERE id = ?`;

    db.query(getProductSql, [productId], (err, productRows) => {
        if (err) throw err;

        const productStock = productRows[0].quantity;

        // 2. Check if user already has this item in the cart
        const checkSql = `
            SELECT quantity FROM cart 
            WHERE user_id = ? AND product_id = ?
        `;

        db.query(checkSql, [userId, productId], (err2, cartRows) => {
            if (err2) throw err2;

            let existingQty = cartRows.length > 0 ? cartRows[0].quantity : 0;
            let finalQty = existingQty + addQty;

            // 3. VALIDATION → Prevent exceeding stock
            if (finalQty > productStock) {
                req.session.error = `Only ${productStock} left in stock!`;
                return res.redirect('/cart');
            }

            // 4. Insert or update based on whether item exists in cart
            if (existingQty > 0) {

                const updateSql = `
                    UPDATE cart SET quantity = ? 
                    WHERE user_id = ? AND product_id = ?
                `;
                db.query(updateSql, [finalQty, userId, productId], (err3) => {
                    if (err3) throw err3;

                    req.session.error = null;
                    return res.redirect('/cart');
                });

            } else {
                const insertSql = `
                    INSERT INTO cart (user_id, product_id, quantity)
                    VALUES (?, ?, ?)
                `;
                db.query(insertSql, [userId, productId, addQty], (err4) => {
                    if (err4) throw err4;

                    req.session.error = null;
                    return res.redirect('/cart');
                });
            }
        });
    });
},

   checkout: (req, res) => {
    const userId = req.session.user.user_id;

    const selectSql = `
        SELECT c.product_id, c.quantity, p.productName, p.price
        FROM cart c
        JOIN products p ON c.product_id = p.id
        WHERE c.user_id = ?
    `;

    db.query(selectSql, [userId], (err, items) => {
        if (err) throw err;

        const insertSql = `
            INSERT INTO orders (user_id, productName, quantity, price)
            VALUES (?, ?, ?, ?)
        `;

        items.forEach(item => {
            // Insert into orders table
            db.query(insertSql, [
                userId,
                item.productName,
                item.quantity,
                item.price
            ]);

            // Reduce stock for each item
            const reduceSql = `
                UPDATE products SET quantity = quantity - ? WHERE id = ?
            `;
            db.query(reduceSql, [item.quantity, item.product_id]);
        });

        // Clear cart
        const deleteSql = `DELETE FROM cart WHERE user_id = ?`;
        db.query(deleteSql, [userId], (err2) => {
            if (err2) throw err2;

            res.render('checkout-success', {
                user: req.session.user,
                items: items
            });
        });
    });
},


    // ---------------- REMOVE ONE ITEM ----------------
removeItem: (req, res) => {
    const cartId = req.params.id;

    const sql = "DELETE FROM cart WHERE cart_id = ?";
    db.query(sql, [cartId], (err) => {
        if (err) throw err;
        res.redirect('/cart');
    });
},

clearCart: (req, res) => {
    const sql = "DELETE FROM cart WHERE user_id = ?";
    db.query(sql, [req.session.user.user_id], (err) => {
        if (err) throw err;
        res.redirect('/cart');
    });
},



    // ---------------- GENERATE PDF ----------------
    generatePDF: (req, res) => {
        const userId = req.session.user.user_id;

        const sql = `
            SELECT productName, quantity, price
            FROM orders
            WHERE user_id = ?
            ORDER BY order_id DESC
            LIMIT 20
        `;

        db.query(sql, [userId], (err, items) => {
            if (err) throw err;

            const doc = new PDFDocument();
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename=receipt.pdf');

            doc.pipe(res);

            doc.fontSize(20).text('🧾 Supermarket Receipt', { align: 'center' });
            doc.moveDown();

            doc.fontSize(14).text(`Customer: ${req.session.user.username}`);
            doc.text(`Date: ${new Date().toLocaleString()}`);
            doc.moveDown();

            doc.fontSize(12);

            items.forEach(item => {
                const total = (item.price * item.quantity).toFixed(2);
                doc.text(`${item.productName}  x${item.quantity}  —  $${total}`);
            });

            doc.end();
        });
    }

};
