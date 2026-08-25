const productService = require('../services/productService');
const notificationService = require('../services/notificationService');
const db = require('../db');

async function createOrderMonolith(req, res) {
  try {
    const product = await productService.checkStock(req.body.productId);
    if (!product || product.stock < req.body.quantity) {
      return res.status(400).json({ error: "Stoku nuk është i mjaftueshëm" });
    }

    const order = await db.orders.create({
      userId: req.user.id,
      productId: req.body.productId,
      quantity: req.body.quantity,
      status: 'PENDING'
    });

    await notificationService.sendEmailNotification(req.user.email, order.id);

    return res.status(201).json(order);
  } catch (error) {
    return res.status(500).json({ error: "Gabim i brendshëm në server" });
  }
}

module.exports = { createOrderMonolith };
