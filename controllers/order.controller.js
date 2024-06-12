const Order = require("../models/Order");
const { randomStringGenerator } = require("../utils/randomStringGenerator");
const productController = require("./product.controller");

const orderController = {};
orderController.createOrder = async (req, res) => {
  try {
    const userId = req.userId;
    const { shipTo, contact, totalPrice, orderList } = req.body;

    // 재고확인 & 재고 업데이트
    const insufficientStockItems = await productController.checkItemsStock(
      orderList
    );

    // 재고가 충분하지 않은 아이템이 있으면 -> 에러
    if (insufficientStockItems.length > 0) {
      const errorMessage = insufficientStockItems.reduce(
        (total, item) => (total += `${item.message} \n;`),
        ""
      );
      throw new Error(errorMessage);
    }
    const orderNum = randomStringGenerator();

    const newOrder = new Order({
      userId,
      totalPrice,
      shipTo,
      contact,
      items: orderList,
      orderNum: orderNum,
    });

    await newOrder.save();

    return res.status(200).json({ status: "ok", orderNum: orderNum });
  } catch (e) {
    return res.status(400).json({ status: "fail", error: e.message });
  }
};
// orderController.createOrder = async (req, res) => {
//   try {
//     const { userId } = req;
//     const { shipTo, contact, totalPrice, orderList } = req.body;

//     const insufficientStockItems = await productController.checkItemListStock(
//       orderList
//     );

//     if (insufficientStockItems.length > 0) {
//       const errorMessage = insufficientStockItems
//         .map((item) => item.message)
//         .join(" ");
//       throw new Error(errorMessage);
//     }

//     await productController.deductItemStock(orderList);

//     const newOrder = new Order({
//       userId,
//       totalPrice,
//       shipTo,
//       contact,
//       items: orderList,
//       orderNum: randomStringGenerator(),
//     });

//     await newOrder.save();

//     res.status(200).json({ status: "success", orderNum: newOrder.orderNum });
//   } catch (error) {
//     res.status(400).json({ status: "fail", error: error.message });
//   }
// };

orderController.getOrder = async (req, res) => {
  try {
    const { userId } = req;
    const { pageSize } = req.query;
    let PAGE_SIZE = pageSize || 10;
    const orderList = await Order.find({ userId: userId }).populate({
      path: "items",
      populate: {
        path: "productId",
        model: "Product",
        select: "image name",
      },
    });
    const totalItemNum = await Order.find({ userId: userId }).count();
    const totalPageNum = Math.ceil(totalItemNum / PAGE_SIZE);

    res.status(200).json({ status: "success", data: orderList, totalPageNum });
  } catch (error) {
    res.status(400).json({ status: "fail", error: error.message });
  }
};

orderController.getOrderList = async (req, res) => {
  try {
    const { page, ordernum, pageSize } = req.query;
    let PAGE_SIZE = pageSize || 10;
    let cond = {};
    if (ordernum) {
      cond = {
        orderNum: { $regex: ordernum, $options: "i" },
      };
    }

    const orderList = await Order.find(cond)
      .populate("userId")
      .populate({
        path: "items",
        populate: {
          path: "productId",
          model: "Product",
          select: "image name",
        },
      })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE);

    const totalItemNum = await Order.find(cond).count();
    const totalPageNum = Math.ceil(totalItemNum / PAGE_SIZE);
    res.status(200).json({ status: "success", data: orderList, totalPageNum });
  } catch (error) {
    res.status(400).json({ status: "fail", error: error.message });
  }
};

orderController.updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(
      id,
      { status: status },
      { new: true }
    );

    if (!order) throw new Error("주문내역을 찾을 수 없습니다.");
    res.status(200).json({ status: "success", data: order });
  } catch (error) {
    res.status(400).json({ status: "fail", error: error.message });
  }
};
module.exports = orderController;
