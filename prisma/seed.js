import db from "../src/config/db.config.js";
import { faker } from "@faker-js/faker";
import { hashPassword } from "../src/utils/hashPassword.util.js";

const NO_OF_RECORDS = 30;

async function main() {
  const bookIds = [];
  const userIds = [];

  // Step 1: Seed Books
  for (let i = 0; i < NO_OF_RECORDS; i++) {
    const book = await db.book.create({
      data: {
        title: faker.book.title(),
        description: faker.lorem.paragraph(2),
        author: faker.person.fullName(),
        genre: faker.book.genre(),
        series: faker.book.series(),
        publisher: faker.book.publisher(),
        format: faker.helpers.arrayElement([
          "AUDIO_BOOK",
          "E_BOOK",
          "HARD_COVER",
          "PAPER_BACK",
        ]),
        price: faker.number.float({ min: 150, max: 2000, fractionDigits: 2 }),
        stock: faker.number.int({ min: 0, max: 100 }),
        isbn: faker.string.alphanumeric(10),
        imageUrl: faker.image.url(),
      },
    });
    bookIds.push(book.bookId);
  }

  // Step 2: Seed Users, Address, and API Keys
  for (let i = 0; i < NO_OF_RECORDS; i++) {
    const user = await db.user.create({
      data: {
        email: faker.internet.email(),
        userName: faker.internet.username(),
        fullName: faker.person.fullName(),
        password: await hashPassword(faker.internet.password()),
        phone: faker.phone.number(),
        addresses: {
          create: {
            addressLine1: faker.location.streetAddress(),
            city: faker.location.city(),
            state: faker.location.state(),
            pincode: faker.location.zipCode(),
            country: faker.location.country(),
          },
        },
      },
      include: {
        addresses: true,
      },
    });

    userIds.push(user.id);

    await db.apiKey.create({
      data: {
        userId: user.id,
        apiKey: faker.string.alphanumeric(32),
      },
    });

    // Step 3: Seed Review
    await db.review.create({
      data: {
        userId: user.id,
        bookId: faker.helpers.arrayElement(bookIds),
        rating: faker.number.int({ min: 1, max: 5 }),
        reviewContent: faker.lorem.sentences(2),
      },
    });

    // Step 4: Seed Order, OrderItems (with unique books), and Payment
    const selectedBookIds = new Set();
    const itemCount = faker.number.int({ min: 1, max: 3 });

    while (selectedBookIds.size < itemCount) {
      const bookId = faker.helpers.arrayElement(bookIds);
      selectedBookIds.add(bookId);
    }

    const orderItems = [];
    let totalAmount = 0;

    for (const bookId of selectedBookIds) {
      const book = await db.book.findUnique({ where: { bookId } });
      if (!book) continue;

      const quantity = faker.number.int({ min: 1, max: 3 });
      const unitPrice = book.price;
      const totalPrice = unitPrice * quantity;

      totalAmount += totalPrice;

      orderItems.push({
        bookId,
        quantity,
        unitPrice,
        totalPrice,
      });
    }

    const addressId = user.addresses[0].id;

    const order = await db.order.create({
      data: {
        userId: user.id,
        addressId,
        totalAmount,
        finalAmount: totalAmount,
        orderItems: {
          create: orderItems,
        },
      },
    });

    await db.payment.create({
      data: {
        orderId: order.orderId,
        amount: totalAmount,
        status: "SUCCESS",
        method: faker.helpers.arrayElement(["RAZORPAY", "COD", "WALLET"]),
        razorpayOrderId: faker.string.alphanumeric(12),
        razorpayPaymentId: faker.string.alphanumeric(14),
        razorpaySignature: faker.string.alphanumeric(24),
      },
    });
  }
}

main()
  .then(async () => {
    console.log("Database seeded successfully.");
    await db.$disconnect();
  })
  .catch(async (e) => {
    console.error("Seeding failed:", e);
    await db.$disconnect();
    process.exit(1);
  });
