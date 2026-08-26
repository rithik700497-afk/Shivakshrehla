/**
 * menu.js
 * ------------------------------------------------------------------
 * All menu content lives in this one file. To add, edit, or remove a
 * dish, just add/edit/delete an object in the MENU_ITEMS array below.
 *
 * Fields:
 *   id          unique number
 *   name        dish name
 *   category    must match one of the CATEGORIES ids below
 *   price       number, in rupees (no symbol)
 *   description short one-line description
 *   type        "veg" | "nonveg"
 *   available   true | false  (false shows "Out of Stock")
 *   icon        which placeholder illustration to use (see script.js
 *               ICONS map) — purely visual, pick whichever fits
 * ------------------------------------------------------------------
 */

const RESTAURANT = {
  name: "Shivaksh Restaurant",
  subtitle: "Fresh • Delicious • Made with Love",
  initials: "SR"
};

// Rotating offer banners shown at the top of the page. No external images
// are used (keeps the site 100% offline-safe on GitHub Pages) — each banner
// is drawn with CSS gradients + a decorative SVG pattern. To use a real
// photo instead, see renderBanner() in script.js and swap in a background-image.
const BANNERS = [
  {
    image: "assets/banners/banner1.jpg",
    eyebrow: "",
    title: "",
    subtitle: ""
  },
  {
    image: "assets/banners/banner2.jpg",
    eyebrow: "",
    title: "",
    subtitle: ""
  },
  {
    image: "assets/banners/banner3.jpg",
    eyebrow: "",
    title: "",
    subtitle: ""
  }
];

const CATEGORIES = [
  { id: "all", label: "All" },

  { id: "starters", label: "Starter" },
  { id: "soups", label: "Soup" },
  { id: "chinese", label: "Chinese" },
  { id: "chowmein", label: "Chowmein" },
  { id: "rolls", label: "Rolls" },
  { id: "southindian", label: "South Indian" },
  { id: "rice", label: "Rice" },
  { id: "biryani", label: "Biryani" },
  { id: "chicken", label: "Chicken" },
  { id: "sabji", label: "Sabji" },
  { id: "paneer", label: "Paneer" },
  { id: "mushroom", label: "Mushroom" },
  { id: "kaju", label: "Kaju" },
  { id: "tandoor", label: "Tandoor" },
  { id: "bread", label: "Roti & Bread" },
  { id: "dal", label: "Dal" },
  { id: "thali", label: "Thali" },
  { id: "salad", label: "Salad & Raita" },
  { id: "drinks", label: "Drinks" }
];

const MENU_ITEMS = [
  { id: 1, name: "Paneer Pakoda", category: "starters", price: 130, description: "", type: "veg", available: true, icon: "bowl" },
  { id: 2, name: "Veg Pakoda", category: "starters", price: 120, description: "", type: "veg", available: true, icon: "bowl" },
  { id: 3, name: "Chicken Pakoda", category: "starters", price: 220, description: "", type: "nonveg", available: true, icon: "bowl" },
  { id: 4, name: "Egg Pakoda", category: "starters", price: 100, description: "", type: "nonveg", available: true, icon: "bowl" },
  { id: 5, name: "Omlet", category: "starters", price: 60, description: "", type: "nonveg", available: true, icon: "bowl" },

  // ================= SOUP =================
  { id: 6, name: "Veg Soup", category: "soups", price: 70, description: "", type: "veg", available: true, icon: "bowl" },
  { id: 7, name: "Veg Manchow Soup", category: "soups", price: 90, description: "", type: "veg", available: true, icon: "bowl" },
  { id: 8, name: "Veg Hot & Sour Soup", category: "soups", price: 90, description: "", type: "veg", available: true, icon: "bowl" },
  { id: 9, name: "Mushroom Soup", category: "soups", price: 120, description: "", type: "veg", available: true, icon: "bowl" },
  { id: 10, name: "Chicken Manchow Soup", category: "soups", price: 120, description: "", type: "nonveg", available: true, icon: "bowl" },
  { id: 11, name: "Chicken Hot & Sour Soup", category: "soups", price: 120, description: "", type: "nonveg", available: true, icon: "bowl" },

  // ================= CHINESE =================
  { id: 12, name: "Veg Chilli", category: "chinese", price: 130, description: "", type: "veg", available: true, icon: "wok" },
  { id: 13, name: "Paneer Chilli", category: "chinese", price: 150, description: "", type: "veg", available: true, icon: "wok" },
  { id: 14, name: "Chana Chilli", category: "chinese", price: 120, description: "", type: "veg", available: true, icon: "wok" },
  { id: 15, name: "Potato Chilli", category: "chinese", price: 120, description: "", type: "veg", available: true, icon: "wok" },
  { id: 16, name: "Honey Potato Chilli", category: "chinese", price: 150, description: "", type: "veg", available: true, icon: "wok" },
  { id: 17, name: "Babycorn Chilli", category: "chinese", price: 170, description: "", type: "veg", available: true, icon: "wok" },
  { id: 18, name: "Mushroom Chilli", category: "chinese", price: 190, description: "", type: "veg", available: true, icon: "wok" },
  { id: 19, name: "Paneer Garlic Chilli", category: "chinese", price: 160, description: "", type: "veg", available: true, icon: "wok" },
  { id: 20, name: "Veg Manchurian", category: "chinese", price: 140, description: "", type: "veg", available: true, icon: "wok" },
  { id: 21, name: "Paneer Manchurian", category: "chinese", price: 170, description: "", type: "veg", available: true, icon: "wok" },
  { id: 22, name: "Mushroom Manchurian", category: "chinese", price: 190, description: "", type: "veg", available: true, icon: "wok" },
  { id: 23, name: "Veg Lolly Pop", category: "chinese", price: 150, description: "", type: "veg", available: true, icon: "skewer" },

  // ================= CHOWMEIN =================
  { id: 24, name: "Mix Chowmein", category: "chowmein", price: 200, description: "", type: "veg", available: true, icon: "noodles" },
  { id: 25, name: "Paneer Chowmene", category: "chowmein", price: 150, description: "", type: "veg", available: true, icon: "noodles" },
  { id: 26, name: "Mushroom Chowmene", category: "chowmein", price: 160, description: "", type: "veg", available: true, icon: "noodles" },
  { id: 27, name: "Schezwan Chowmene", category: "chowmein", price: 130, description: "", type: "veg", available: true, icon: "noodles" },
  { id: 28, name: "Mushroom Salt Paper", category: "chowmein", price: 200, description: "", type: "veg", available: true, icon: "noodles" },
  { id: 29, name: "Veg Chopsuey", category: "chowmein", price: 160, description: "", type: "veg", available: true, icon: "noodles" },
  { id: 30, name: "American Chopsuey", category: "chowmein", price: 190, description: "", type: "veg", available: true, icon: "noodles" },
  { id: 31, name: "Veg Hakka Noodle", category: "chowmein", price: 160, description: "", type: "veg", available: true, icon: "noodles" },
  { id: 32, name: "Chicken Chowmene", category: "chowmein", price: 160, description: "", type: "nonveg", available: true, icon: "noodles" },
  { id: 33, name: "Chicken Singapuri Chowmene", category: "chowmein", price: 170, description: "", type: "nonveg", available: true, icon: "noodles" },
  { id: 34, name: "Chicken Schezwan Chowmene", category: "chowmein", price: 180, description: "", type: "nonveg", available: true, icon: "noodles" },
  { id: 35, name: "Non Veg Mix Chowmene", category: "chowmein", price: 190, description: "", type: "nonveg", available: true, icon: "noodles" },
  { id: 36, name: "Egg Chowmene", category: "chowmein", price: 150, description: "", type: "nonveg", available: true, icon: "noodles" },
  { id: 37, name: "Veg Chowmene", category: "chowmein", price: 120, description: "", type: "veg", available: true, icon: "noodles" },

  // ================= ROLLS =================
  { id: 38, name: "Veg Roll", category: "rolls", price: 70, description: "", type: "veg", available: true, icon: "skewer" },
  { id: 39, name: "Paneer Roll", category: "rolls", price: 90, description: "", type: "veg", available: true, icon: "skewer" },
  { id: 40, name: "Egg Roll", category: "rolls", price: 100, description: "", type: "nonveg", available: true, icon: "skewer" },
  { id: 41, name: "Chicken Roll", category: "rolls", price: 130, description: "", type: "nonveg", available: true, icon: "skewer" },

  // ================= SOUTH INDIAN =================
  { id: 42, name: "Paper Dhosa", category: "southindian", price: 80, description: "", type: "veg", available: true, icon: "bowl" },
  { id: 43, name: "Masala Dhosa", category: "southindian", price: 100, description: "", type: "veg", available: true, icon: "bowl" },
  { id: 44, name: "Paneer Masala Dhosa", category: "southindian", price: 120, description: "", type: "veg", available: true, icon: "bowl" },
  { id: 45, name: "Paneer Dhosa", category: "southindian", price: 130, description: "", type: "veg", available: true, icon: "bowl" },
  { id: 46, name: "Special Dhosa", category: "southindian", price: 180, description: "", type: "veg", available: true, icon: "bowl" },
  { id: 47, name: "Onion Dhosa", category: "southindian", price: 100, description: "", type: "veg", available: true, icon: "bowl" },
  { id: 48, name: "Onion Masala Dhosa", category: "southindian", price: 110, description: "", type: "veg", available: true, icon: "bowl" },
  { id: 49, name: "Masala Dhosa Butter", category: "southindian", price: 120, description: "", type: "veg", available: true, icon: "bowl" },
  { id: 50, name: "Cheese Masala Dhosa", category: "southindian", price: 140, description: "", type: "veg", available: true, icon: "bowl" },
  { id: 51, name: "Veg Uttapam", category: "southindian", price: 100, description: "", type: "veg", available: true, icon: "bowl" },
  { id: 52, name: "Onion Uttapam", category: "southindian", price: 100, description: "", type: "veg", available: true, icon: "bowl" },
  { id: 53, name: "Paneer Uttapam", category: "southindian", price: 130, description: "", type: "veg", available: true, icon: "bowl" },

  // ================= RICE =================
  { id: 54, name: "Plain Rice", category: "rice", price: 90, description: "Half ₹50", type: "veg", available: true, icon: "bowl" },
  { id: 55, name: "Jeera Rice", category: "rice", price: 110, description: "Half ₹70", type: "veg", available: true, icon: "bowl" },
  { id: 56, name: "Veg Pulao", category: "rice", price: 160, description: "", type: "veg", available: true, icon: "bowl" },
  { id: 57, name: "Matar Pulao", category: "rice", price: 150, description: "", type: "veg", available: true, icon: "bowl" },
  { id: 58, name: "Sahi Pulao", category: "rice", price: 180, description: "", type: "veg", available: true, icon: "bowl" },
  { id: 59, name: "Veg Fried Rice", category: "rice", price: 160, description: "", type: "veg", available: true, icon: "bowl" },
  { id: 60, name: "Mushroom Fried Rice", category: "rice", price: 180, description: "", type: "veg", available: true, icon: "bowl" },
  { id: 61, name: "Paneer Fried Rice", category: "rice", price: 180, description: "", type: "veg", available: true, icon: "bowl" },
  { id: 62, name: "Mix Fried Rice", category: "rice", price: 200, description: "", type: "veg", available: true, icon: "bowl" },
  { id: 63, name: "Navratan Pulao", category: "rice", price: 240, description: "", type: "veg", available: true, icon: "bowl" },
  { id: 64, name: "Egg Fried Rice", category: "rice", price: 170, description: "", type: "nonveg", available: true, icon: "bowl" },
  { id: 65, name: "Chicken Fried Rice", category: "rice", price: 170, description: "", type: "nonveg", available: true, icon: "bowl" },

  // ================= BIRYANI =================
  { id: 66, name: "Veg Biryani", category: "biryani", price: 160, description: "", type: "veg", available: true, icon: "bowl" },
  { id: 67, name: "Veg Hydrabadi Biryani", category: "biryani", price: 190, description: "", type: "veg", available: true, icon: "bowl" },
  { id: 68, name: "Special Biryani", category: "biryani", price: 230, description: "", type: "veg", available: true, icon: "bowl" },
  { id: 69, name: "Paneer Biryani", category: "biryani", price: 180, description: "", type: "veg", available: true, icon: "bowl" },
  { id: 70, name: "Egg Biryani", category: "biryani", price: 160, description: "", type: "nonveg", available: true, icon: "bowl" },
  { id: 71, name: "Chicken Biryani", category: "biryani", price: 180, description: "", type: "nonveg", available: true, icon: "bowl" },
  { id: 72, name: "Chicken Hybrabadi Biryani", category: "biryani", price: 210, description: "", type: "nonveg", available: true, icon: "bowl" },
  { id: 73, name: "Chicken Dum Biryani", category: "biryani", price: 210, description: "", type: "nonveg", available: true, icon: "bowl" },

  // ================= CHICKEN =================
  { id: 74, name: "Chicken Chilli (Bone/Boneless)", category: "chicken", price: 190, description: "Bone ₹190 / Boneless ₹220", type: "nonveg", available: true, icon: "wok" },
  { id: 75, name: "Chicken Manchurian", category: "chicken", price: 220, description: "", type: "nonveg", available: true, icon: "wok" },
  { id: 76, name: "Chicken Salt Paper", category: "chicken", price: 190, description: "", type: "nonveg", available: true, icon: "wok" },
  { id: 77, name: "Chicken Garlic Chily", category: "chicken", price: 220, description: "", type: "nonveg", available: true, icon: "wok" },
  { id: 78, name: "Chicken 65 (Bone/Boneless)", category: "chicken", price: 190, description: "Bone ₹190 / Boneless ₹220", type: "nonveg", available: true, icon: "wok" },
  { id: 79, name: "Chicken Lollypop", category: "chicken", price: 190, description: "", type: "nonveg", available: true, icon: "skewer" },
  { id: 80, name: "Chicken Curry (2PC/4PC)", category: "chicken", price: 120, description: "2PC ₹120 / 4PC ₹180", type: "nonveg", available: true, icon: "curry" },
  { id: 81, name: "Chicken Dehati (4PC/8PC)", category: "chicken", price: 250, description: "4PC ₹250 / 8PC ₹420", type: "nonveg", available: true, icon: "curry" },
  { id: 82, name: "Chicken Masala (4PC)", category: "chicken", price: 220, description: "", type: "nonveg", available: true, icon: "curry" },
  { id: 83, name: "Chicken Do Pyaja (4PC)", category: "chicken", price: 220, description: "", type: "nonveg", available: true, icon: "curry" },
  { id: 84, name: "Chicken Kadahi (4PC)", category: "chicken", price: 230, description: "", type: "nonveg", available: true, icon: "curry" },
  { id: 85, name: "Chicken Keema", category: "chicken", price: 220, description: "", type: "nonveg", available: true, icon: "curry" },
  { id: 86, name: "Chicken Lababdar (4PC)", category: "chicken", price: 230, description: "", type: "nonveg", available: true, icon: "curry" },
  { id: 87, name: "Kolhapuri Chicken (4PC)", category: "chicken", price: 220, description: "", type: "nonveg", available: true, icon: "curry" },
  { id: 88, name: "Chicken Angara (4PC)", category: "chicken", price: 230, description: "", type: "nonveg", available: true, icon: "curry" },
  { id: 89, name: "Punjabi Chicken (4PC/8PC)", category: "chicken", price: 250, description: "4PC ₹250 / 8PC ₹420", type: "nonveg", available: true, icon: "curry" },
  { id: 90, name: "Afgani Chicken (4PC)", category: "chicken", price: 230, description: "", type: "nonveg", available: true, icon: "curry" },
  { id: 91, name: "Egg Curry (2PC)", category: "chicken", price: 90, description: "", type: "nonveg", available: true, icon: "curry" },
  { id: 92, name: "Egg Bhurji", category: "chicken", price: 70, description: "", type: "nonveg", available: true, icon: "bowl" },
  { id: 93, name: "Omlet Curry", category: "chicken", price: 100, description: "", type: "nonveg", available: true, icon: "curry" },
  { id: 94, name: "Chicken Butter Masala", category: "chicken", price: 250, description: "", type: "nonveg", available: true, icon: "curry" },

  // ================= SABJI =================
  { id: 95, name: "Aloo Jeera", category: "sabji", price: 100, description: "", type: "veg", available: true, icon: "curry" },
  { id: 96, name: "Mix Veg", category: "sabji", price: 160, description: "", type: "veg", available: true, icon: "curry" },
  { id: 97, name: "Aloo Bhujia", category: "sabji", price: 90, description: "", type: "veg", available: true, icon: "curry" },
  { id: 98, name: "Aloo Gobhi Bhujia", category: "sabji", price: 110, description: "", type: "veg", available: true, icon: "curry" },
  { id: 99, name: "Bhindi Bhujia", category: "sabji", price: 100, description: "", type: "veg", available: true, icon: "curry" },
  { id: 100, name: "Patal Bhujia", category: "sabji", price: 100, description: "", type: "veg", available: true, icon: "curry" },
  { id: 101, name: "Karaila Bhujia", category: "sabji", price: 100, description: "", type: "veg", available: true, icon: "curry" },
  { id: 102, name: "Aloo Patal Sabji", category: "sabji", price: 140, description: "", type: "veg", available: true, icon: "curry" },
  { id: 103, name: "Aloo Gobhi Sabji", category: "sabji", price: 140, description: "", type: "veg", available: true, icon: "curry" },
  { id: 104, name: "Aloo Palak", category: "sabji", price: 130, description: "", type: "veg", available: true, icon: "curry" },
  { id: 105, name: "Matar Paneer", category: "sabji", price: 160, description: "", type: "veg", available: true, icon: "curry" },

  // ================= PANEER =================
  { id: 106, name: "Paneer Masala", category: "paneer", price: 170, description: "", type: "veg", available: true, icon: "curry" },
  { id: 107, name: "Paneer Butter Masala", category: "paneer", price: 180, description: "", type: "veg", available: true, icon: "curry" },
  { id: 108, name: "Paneer Do Payaja", category: "paneer", price: 180, description: "", type: "veg", available: true, icon: "curry" },
  { id: 109, name: "Paneer Kadahi", category: "paneer", price: 190, description: "", type: "veg", available: true, icon: "curry" },
  { id: 110, name: "Paneer Bhujiya", category: "paneer", price: 150, description: "", type: "veg", available: true, icon: "curry" },
  { id: 111, name: "Paneer Handi", category: "paneer", price: 200, description: "", type: "veg", available: true, icon: "curry" },
  { id: 112, name: "Paneer Keema", category: "paneer", price: 180, description: "", type: "veg", available: true, icon: "curry" },
  { id: 113, name: "Paneer Jhalfrezi", category: "paneer", price: 180, description: "", type: "veg", available: true, icon: "curry" },
  { id: 114, name: "Sahi Paneer", category: "paneer", price: 210, description: "", type: "veg", available: true, icon: "curry" },
  { id: 115, name: "Paneer Angara", category: "paneer", price: 220, description: "", type: "veg", available: true, icon: "curry" },
  { id: 116, name: "Paneer Patiala", category: "paneer", price: 220, description: "", type: "veg", available: true, icon: "curry" },
  { id: 117, name: "Paneer Chatpata", category: "paneer", price: 220, description: "", type: "veg", available: true, icon: "curry" },
  { id: 118, name: "Paneer Punjabi", category: "paneer", price: 220, description: "", type: "veg", available: true, icon: "curry" },
  { id: 119, name: "Paneer Lababdar", category: "paneer", price: 240, description: "", type: "veg", available: true, icon: "curry" },
  { id: 120, name: "Paneer Kalimirch", category: "paneer", price: 220, description: "", type: "veg", available: true, icon: "curry" },
  { id: 121, name: "Paneer Mushroom Taj", category: "paneer", price: 250, description: "", type: "veg", available: true, icon: "curry" },
  { id: 122, name: "Veg Do Pyaja", category: "sabji", price: 180, description: "", type: "veg", available: true, icon: "curry" },
  { id: 123, name: "Veg Kadahi", category: "sabji", price: 180, description: "", type: "veg", available: true, icon: "curry" },
  { id: 124, name: "Aloo Dum", category: "sabji", price: 140, description: "", type: "veg", available: true, icon: "curry" },
  { id: 125, name: "Aloo Dum Kashmiri", category: "sabji", price: 180, description: "", type: "veg", available: true, icon: "curry" },
  { id: 126, name: "Veg Kofta", category: "sabji", price: 190, description: "", type: "veg", available: true, icon: "curry" },
  { id: 127, name: "Paneer Kofta", category: "paneer", price: 220, description: "", type: "veg", available: true, icon: "curry" },
  { id: 128, name: "Malai Kofta", category: "paneer", price: 220, description: "", type: "veg", available: true, icon: "curry" },
  { id: 129, name: "Paneer Korma", category: "paneer", price: 200, description: "", type: "veg", available: true, icon: "curry" },

  // ================= MUSHROOM =================
  { id: 130, name: "Paneer Mushroom Masala", category: "mushroom", price: 210, description: "", type: "veg", available: true, icon: "curry" },
  { id: 131, name: "Mushroom Masala", category: "mushroom", price: 200, description: "", type: "veg", available: true, icon: "curry" },
  { id: 132, name: "Mushroom Butter Masala", category: "mushroom", price: 220, description: "", type: "veg", available: true, icon: "curry" },
  { id: 133, name: "Mushroom Do Pyaja", category: "mushroom", price: 220, description: "", type: "veg", available: true, icon: "curry" },
  { id: 134, name: "Mushroom Kadahi", category: "mushroom", price: 230, description: "", type: "veg", available: true, icon: "curry" },
  { id: 135, name: "Mushroom Handi", category: "mushroom", price: 240, description: "", type: "veg", available: true, icon: "curry" },
  { id: 136, name: "Mushroom Curry", category: "mushroom", price: 200, description: "", type: "veg", available: true, icon: "curry" },
  { id: 137, name: "Mushroom Chatpata", category: "mushroom", price: 240, description: "", type: "veg", available: true, icon: "curry" },
  { id: 138, name: "Babycorn Do Pyaja", category: "mushroom", price: 200, description: "", type: "veg", available: true, icon: "curry" },
  { id: 139, name: "Stuffed Tamatar", category: "mushroom", price: 180, description: "", type: "veg", available: true, icon: "curry" },
  { id: 140, name: "Stuffed Shimla", category: "mushroom", price: 190, description: "", type: "veg", available: true, icon: "curry" },

  // ================= KAJU =================
  { id: 141, name: "Kaju Fry", category: "kaju", price: 200, description: "", type: "veg", available: true, icon: "bowl" },
  { id: 142, name: "Kaju Masala", category: "kaju", price: 250, description: "", type: "veg", available: true, icon: "bowl" },
  { id: 143, name: "Kaju Butter Masala", category: "kaju", price: 260, description: "", type: "veg", available: true, icon: "bowl" },
  { id: 144, name: "Kaju Do Pyaja", category: "kaju", price: 250, description: "", type: "veg", available: true, icon: "bowl" },
  { id: 145, name: "Kaju Kadahi", category: "kaju", price: 260, description: "", type: "veg", available: true, icon: "bowl" },
  { id: 146, name: "Kaju Korma", category: "kaju", price: 280, description: "", type: "veg", available: true, icon: "bowl" },

  // ================= TANDOOR =================
  { id: 147, name: "Tandoor Roti", category: "tandoor", price: 15, description: "", type: "veg", available: true, icon: "bowl" },
  { id: 148, name: "Butter Tandoor Roti", category: "tandoor", price: 20, description: "", type: "veg", available: true, icon: "bowl" },
  { id: 149, name: "Plain Naan", category: "bread", price: 50, description: "", type: "veg", available: true, icon: "bowl" },
  { id: 150, name: "Butter Naan", category: "bread", price: 60, description: "", type: "veg", available: true, icon: "bowl" },
  { id: 151, name: "Sahi Naan", category: "bread", price: 100, description: "", type: "veg", available: true, icon: "bowl" },
  { id: 152, name: "Cheese Naan", category: "bread", price: 100, description: "", type: "veg", available: true, icon: "bowl" },
  { id: 153, name: "Garlic Naan", category: "bread", price: 80, description: "", type: "veg", available: true, icon: "bowl" },
  { id: 154, name: "Stuff Naan", category: "bread", price: 90, description: "", type: "veg", available: true, icon: "bowl" },
  { id: 155, name: "Masala Kulcha", category: "bread", price: 80, description: "", type: "veg", available: true, icon: "bowl" },
  { id: 156, name: "Paneer Kulcha", category: "bread", price: 90, description: "", type: "veg", available: true, icon: "bowl" },
  { id: 157, name: "Malai Kulcha", category: "bread", price: 110, description: "", type: "veg", available: true, icon: "bowl" },
  { id: 158, name: "Missi Roti", category: "bread", price: 50, description: "", type: "veg", available: true, icon: "bowl" },
  { id: 159, name: "Aloo Paratha", category: "bread", price: 50, description: "", type: "veg", available: true, icon: "bowl" },
  { id: 160, name: "Sattu Paratha", category: "bread", price: 60, description: "", type: "veg", available: true, icon: "bowl" },
  { id: 161, name: "Gobhi Paratha", category: "bread", price: 50, description: "", type: "veg", available: true, icon: "bowl" },
  { id: 162, name: "Muli Paratha", category: "bread", price: 50, description: "", type: "veg", available: true, icon: "bowl" },
  { id: 163, name: "Lachha Paratha", category: "bread", price: 60, description: "", type: "veg", available: true, icon: "bowl" },
  { id: 164, name: "Tawa Roti", category: "bread", price: 15, description: "", type: "veg", available: true, icon: "bowl" },
  { id: 165, name: "Tawa Butter Roti", category: "bread", price: 20, description: "", type: "veg", available: true, icon: "bowl" },
  { id: 166, name: "Tawa Paratha", category: "bread", price: 40, description: "", type: "veg", available: true, icon: "bowl" },

  // ================= DAL =================
  { id: 167, name: "Plain Daal", category: "dal", price: 100, description: "", type: "veg", available: true, icon: "curry" },
  { id: 168, name: "Daal Fried Butter", category: "dal", price: 120, description: "Half ₹80", type: "veg", available: true, icon: "curry" },
  { id: 169, name: "Daal Tadka", category: "dal", price: 140, description: "Half ₹90", type: "veg", available: true, icon: "curry" },

  // ================= THALI =================
  { id: 170, name: "Veg Special Thali", category: "thali", price: 240, description: "Packaging charge ₹20 extra", type: "veg", available: true, icon: "bowl" },

  // ================= SALAD / RAITA =================
  { id: 171, name: "Green Salad Half", category: "salad", price: 50, description: "", type: "veg", available: true, icon: "bowl" },
  { id: 172, name: "Green Salad Full", category: "salad", price: 70, description: "", type: "veg", available: true, icon: "bowl" },
  { id: 173, name: "Onion Salad", category: "salad", price: 25, description: "", type: "veg", available: true, icon: "bowl" },
  { id: 174, name: "Mix Raita", category: "salad", price: 90, description: "", type: "veg", available: true, icon: "bowl" },
  { id: 175, name: "Bundi Raita", category: "salad", price: 90, description: "", type: "veg", available: true, icon: "bowl" },
  { id: 176, name: "Dahi", category: "salad", price: 60, description: "", type: "veg", available: true, icon: "bowl" },
  { id: 177, name: "Peanut Masala", category: "salad", price: 140, description: "", type: "veg", available: true, icon: "bowl" },

  // ================= DRINKS =================
  { id: 178, name: "Masala Cold Drinks", category: "drinks", price: 40, description: "", type: "veg", available: true, icon: "drink" },
  { id: 179, name: "Lassi", category: "drinks", price: 70, description: "", type: "veg", available: true, icon: "drink" },
  { id: 180, name: "Coffee", category: "drinks", price: 50, description: "", type: "veg", available: true, icon: "drink" },
  { id: 181, name: "Masala Chhachh", category: "drinks", price: 60, description: "", type: "veg", available: true, icon: "drink" }
];
