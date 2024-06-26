const Product = require("../models/Product");

const productController = {};

productController.createProduct = async (req, res) => {
  try {
    const {
      sku,
      name,
      size,
      image,
      category,
      description,
      price,
      stock,
      status,
    } = req.body;
    const product = new Product({
      sku,
      name,
      size,
      image,
      category,
      description,
      price,
      stock,
      status,
    });

    await product.save();
    res.status(200).json({ status: "success", product });
  } catch (error) {
    res.status(400).json({ status: "fail", error: error.message });
  }
};

productController.getProducts = async (req, res) => {
  try {
    const { page, name, pageSize } = req.query;
    const cond = name
      ? { name: { $regex: name, $options: "i" }, isDeleted: false }
      : { isDeleted: false };
    let PAGE_SIZE = pageSize || 5;
    let query = Product.find(cond);
    let response = { status: "success" };

    if (page) {
      query.skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE);

      const totalItemNum = await Product.find(cond).count();
      const totalPageNum = Math.ceil(totalItemNum / PAGE_SIZE);
      response.totalPageNum = totalPageNum;
    }

    const productList = await query.exec();
    response.data = productList;
    res.status(200).json(response);
  } catch (error) {
    res.status(400).json({ status: "fail", error: error.message });
  }
};

productController.updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const {
      sku,
      name,
      size,
      image,
      price,
      description,
      category,
      stock,
      status,
    } = req.body;
    const product = await Product.findByIdAndUpdate(
      { _id: productId },
      { sku, name, size, image, price, description, category, stock, status },
      { new: true }
    );

    if (!product) throw new Error("상품이 존재하지 않습니다.");
    res.status(200).json({ status: "success", data: product });
  } catch (error) {
    res.status(400).json({ status: "fail", error: error.message });
  }
};

productController.deleteProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Product.findByIdAndUpdate(
      { _id: productId },
      { isDeleted: true }
    );

    if (!product) throw new Error("상품을 찾을 수 없습니다.");
    res.status(200).json({ status: "success" });
  } catch (error) {
    res.status(400).json({ status: "fail", error: error.message });
  }
};

productController.getProductById = async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Product.findById(productId);
    if (!product) throw new Error("상품을 찾을 수 없습니다.");
    res.status(200).json({ status: "success", data: product });
  } catch (error) {
    res.status(400).json({ status: "fail", error: error.message });
  }
};

// productController.checkStock = async (item) => {
//   const product = await Product.findById(item.productId);

//   if (product.stock[item.size] < item.qty) {
//     return {
//       isVerify: false,
//       message: `${product.name}의 ${item.size}재고가 부족합니다.`,
//     };
//   }

//   const newStock = { ...product.stock };
//   newStock[item.size] -= item.qty;
//   product.stock = newStock;

//   await product.save();

//   return { isVerify: true };
// };

// productController.checkItemListStock = async (itemList) => {
//   try {
//     const products = await Product.find({
//       _id: { $in: itemList.map((item) => item.productId) },
//     });

//     const productMap = products.reduce((map, product) => {
//       map[product._id] = product;
//       return map;
//     }, {});

//     const insufficientStockItems = itemList
//       .filter((item) => {
//         const product = productMap[item.productId];
//         return product.stock[item.size] < item.qty;
//       })
//       .map((item) => {
//         return {
//           item,
//           message: `${productMap[item.productId].name}의 ${
//             item.size
//           }재고가 부족합니다.`,
//         };
//       });

//     return insufficientStockItems;
//   } catch (error) {
//     throw new Error("재고 확인 중 오류가 발생했습니다.");
//   }
// };

// productController.deductItemStock = async (itemList) => {
//   try {
//     await Promise.all(
//       itemList.map(async (item) => {
//         const product = await Product.findById(item.productId);

//         if (!product) {
//           throw new Error(
//             `ID에 해당하는 제품을 찾을 수 없습니다: ${item.productId}`
//           );
//         }

//         product.stock[item.size] = product.stock[item.size] - item.qty;
//         return product.save();
//       })
//     );
//   } catch (error) {
//     throw new Error("제품 재고 업데이트에 실패하였습니다.");
//   }
// };

productController.checkStock = async (item) => {
  try {
    const product = await Product.findById(item.productId);

    if (product.stock[item.size] < item.qty) {
      return {
        isVerify: false,
        message: `${product.name}의 ${item.size} 재고가 부족합니다. \n현재 ${
          product.stock[item.size]
        }개 재고가 있습니다.`,
      };
    } else {
      return { isVerify: true };
    }
  } catch (e) {
    res.status(400).json({ status: "fail", error: e.message });
  }
};

productController.processStock = async (item) => {
  try {
    const product = await Product.findById(item.productId);
    const newStock = { ...product.stock };
    newStock[item.size] -= item.qty;
    product.stock = newStock;
    await product.save();
  } catch (e) {
    res.status(400).json({ status: "fail", error: e.message });
  }
};

productController.checkItemsStock = async (items) => {
  const insufficientStockItems = [];
  try {
    await Promise.all(
      items.map(async (item) => {
        const stockCheck = await productController.checkStock(item);
        if (!stockCheck.isVerify) {
          insufficientStockItems.push({ item, message: stockCheck.message });
        }
      })
    );
    if (insufficientStockItems.length === 0) {
      await Promise.all(
        items.map(async (item) => {
          await productController.processStock(item);
        })
      );
    }
    return insufficientStockItems;
  } catch (e) {
    res.status(400).json({ status: "fail", error: e.message });
  }
};

module.exports = productController;
