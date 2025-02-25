import express from 'express';
import bodyParser from 'body-parser';
import env from "dotenv";

// add this
import mongoose from 'mongoose';
import _ from 'lodash';

const app = express();
env.config();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

// add this (Connection to MongoDB)
  mongoose.connect(process.env.MONGO_CONN);
  console.log("Connected successfully to server");

// add this (Create a schema)
const itemsSchema = new mongoose.Schema({
  name: String
});

// add this (Create model [Collection])
const Item = mongoose.model('Item', itemsSchema);

// add this (Insert Items)
const item1 = new Item({
  name: "Welcome to your todolist!"
});
const item2 = new Item({
  name: "Hit the + button to add a new item."
});
const item3 = new Item({
  name: "<-- Hit this to delete an item."
});

// add this (Insert Items into the collection)
const defaultItems = [item1, item2, item3];

// add this
// Item.insertMany(defaultItems);

//  add this (Create Schema)
const listSchema = new mongoose.Schema({
  name: String,
  items: [itemsSchema]
});

// add this (Create Model)
const List = mongoose.model('List', listSchema);

app.get("/", async function(req, res) {
  //  add this (Read Items)
  try {
    // انتظار استرجاع العناصر من قاعدة البيانات باستخدام await
    const foundItems = await Item.find({});
    if (foundItems.length === 0) {
      // إدراج العناصر الافتراضية إذا كانت قاعدة البيانات فارغة
      await Item.insertMany(defaultItems);
      console.log("Successfully saved default items to DB.");
      // إعادة التوجيه إلى الصفحة الرئيسية بعد الإدراج
      return res.redirect("/");
    } 
    // عرض العناصر إذا كانت قاعدة البيانات تحتوي عليها
    res.render("list", { listTitle: "Today", newListItems: foundItems });
  } catch (err) {
    // معالجة الأخطاء بشكل مناسب وطباعة أي خطأ يحدث
    console.error("Error fetching or inserting items:", err);
    res.status(500).send("An error occurred while fetching or inserting items.");
  }
});

// add this (Create Route for New List [Creating Custom List])
app.get("/:customListName", async function(req, res) {
  try {
    const customListName = _.capitalize(req.params.customListName);
    // ابحث عن القائمة بناءً على الاسم المخصص
    const foundList = await List.findOne({ name: customListName });
    if (!foundList) {
      // إذا لم يتم العثور على القائمة، أنشئ قائمة جديدة
      const list = new List({
        name: customListName,
        items: defaultItems
      });
      await list.save();
      return res.redirect("/" + customListName);
    }
    // إذا تم العثور على القائمة، اعرضها
    res.render("list", { listTitle: foundList.name, newListItems: foundList.items });
  } catch (err) {
    console.error("Error fetching or inserting items:", err); // عرض الخطأ في وحدة التحكم
    res.status(500).send("An error occurred while fetching or inserting items."); // استجابة ملائمة للخطأ
  }
});

// add this (Add Item to List [Default list "Today"] OR [Custom List])
app.post("/", async function(req, res) {
  try {
    // استخراج اسم العنصر واسم القائمة من الطلب
    const itemName = req.body.newItem;
    const listName = req.body.list;
    // إنشاء عنصر جديد
    const item = new Item({
      name: itemName
    });
    if (listName === "Today") {
      // إذا كانت القائمة هي "Today"، احفظ العنصر وأعد التوجيه إلى الصفحة الرئيسية
      await item.save();
      return res.redirect("/");
    } else {
      // ابحث عن القائمة المطلوبة
      const foundList = await List.findOne({ name: listName });
      if (foundList) {
        // أضف العنصر إلى القائمة واحفظ التغييرات
        foundList.items.push(item);
        await foundList.save();
      }
      // إعادة التوجيه إلى الصفحة المخصصة بالقائمة
      res.redirect("/" + listName);
    }
  } catch (err) {
    console.error("Error fetching or inserting items:", err); // تسجيل الخطأ
    res.status(500).send("An error occurred while fetching or inserting items."); // استجابة ملائمة للخطأ
  }
});

// add this (Delete Item to List [Default list "Today"] OR [Custom List])
app.post("/delete", async function(req, res) {
  try {
    const checkedItemId = req.body.checkbox;
    const listName = req.body.listName;
    if (listName === "Today") {
      // استخدام findByIdAndDelete بدلاً من findByIdAndRemove
      await Item.findByIdAndDelete(checkedItemId); // to delete item from "Today" list
      // إعادة التوجيه إلى الصفحة الرئيسية بعد الحذف
      return res.redirect("/");
    } else {
      // find the list by name then delete the item from the list
      await List.findOneAndUpdate(
        { name: listName }, //  filter
        { $pull: { items: { _id: checkedItemId } } } //  update
      );
      // إعادة التوجيه إلى القائمة المحددة بعد الحذف
      return res.redirect("/" + listName);
    }
  } catch (err) {
    // معالجة الأخطاء بشكل مناسب
    console.error("Error deleting item:", err);
    res.status(500).send("An error occurred while deleting the item.");
  }
});

app.listen(process.env.PORT, function() {
  console.log(`Server started on port ${process.env.PORT}`);
});