const amqp = require('amqplib');
const axios = require('axios');
const CircuitBreaker = require('opossum');

// Konfigurimi i Circuit Breaker (Pika 5.3)
const options = {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 10000
};

async function callProductService(productId) {
  return await axios.get(`http://product-service:3002/products/${productId}`);
}

const breaker = new CircuitBreaker(callProductService, options);
breaker.fallback(() => ({ data: { stock: 0, fallback: true } }));

// Logjika e Microservice (Pika 5.2)
async function createOrderMicroservice(req, res) {
  try {
    const stockResponse = await breaker.fire(req.body.productId);

    if (stockResponse.data.stock < req.body.quantity) {
      return res.status(400).json({ error: "Stoku nuk është i mjaftueshëm" });
    }

    const order = await saveOrderToOrderDB(req.body);

    const channel = await rabbitMQConnection.createChannel();
    const eventData = { orderId: order.id, email: req.user.email, type: 'ORDER_CREATED' };

    await channel.assertExchange('order_events', 'topic', { durable: true });
    channel.publish('order_events', 'order.created', Buffer.from(JSON.stringify(eventData)));

    return res.status(201).json(order);
  } catch (error) {
    return res.status(500).json({ error: "Gabim në përpunimin e porosisë" });
  }
}

module.exports = { createOrderMicroservice };
