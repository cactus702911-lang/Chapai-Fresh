const fs = require('fs');
const path = require('path');

const action = process.argv[2];
const dataFilePath = path.join(__dirname, 'site_data.js');

if (action === 'get') {
  try {
    // Delete from cache to get fresh updates
    delete require.cache[require.resolve(dataFilePath)];
    const siteData = require(dataFilePath);
    console.log(JSON.stringify(siteData, null, 2));
  } catch (err) {
    console.error('Error reading site_data.js:', err.message);
    process.exit(1);
  }
} else if (action === 'save') {
  try {
    const tempFilePath = process.argv[3];
    if (!tempFilePath) {
      console.error('Error: Temp file path not provided.');
      process.exit(1);
    }
    
    // Read the temp JSON file
    let rawData = fs.readFileSync(tempFilePath, 'utf-8');
    // Strip UTF-8 BOM if present
    if (rawData.startsWith('\uFEFF')) {
      rawData = rawData.slice(1);
    }
    const parsed = JSON.parse(rawData);
    
    // Helper to decode and save base64 image
    const saveBase64Image = (base64Str, prefix) => {
      const matches = base64Str.match(/^data:image\/([A-Za-z0-9-+]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        let ext = matches[1];
        if (ext === 'jpeg') ext = 'jpg';
        else if (ext === 'svg+xml') ext = 'svg';
        else ext = ext || 'png';
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');
        
        const logoDir = path.join(__dirname, 'images', 'logo');
        if (!fs.existsSync(logoDir)) {
          fs.mkdirSync(logoDir, { recursive: true });
        }
        
        // Delete old logo/favicon files with the same prefix to avoid clutter
        try {
          const files = fs.readdirSync(logoDir);
          files.forEach(file => {
            if (file.startsWith(prefix + '-') || file === `${prefix}.png` || file === `${prefix}.ico`) {
              try {
                fs.unlinkSync(path.join(logoDir, file));
              } catch (e) {}
            }
          });
        } catch (e) {}

        const timestamp = Date.now();
        const fileName = `${prefix}-${timestamp}.${ext}`;
        const filePath = path.join(logoDir, fileName);
        fs.writeFileSync(filePath, buffer);
        
        return `images/logo/${fileName}`;
      }
      return null;
    };

    // Load existing database to find deleted products and clean up files
    let oldProducts = [];
    try {
      delete require.cache[require.resolve(dataFilePath)];
      const oldSiteData = require(dataFilePath);
      if (oldSiteData && oldSiteData.products) {
        oldProducts = oldSiteData.products;
      }
    } catch (e) {}

    // Helper to decode and save base64 product image
    const saveBase64ProductImage = (base64Str, prefix) => {
      const matches = base64Str.match(/^data:image\/([A-Za-z0-9-+]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        let ext = matches[1];
        if (ext === 'jpeg') ext = 'jpg';
        else if (ext === 'svg+xml') ext = 'svg';
        else ext = ext || 'png';
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');
        
        const imagesDir = path.join(__dirname, 'images');
        if (!fs.existsSync(imagesDir)) {
          fs.mkdirSync(imagesDir, { recursive: true });
        }
        
        // Delete old product images with this exact prefix slot to avoid clutter
        try {
          const files = fs.readdirSync(imagesDir);
          const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const exactPattern = new RegExp(`^product-${escapedPrefix}-\\d+\\.[A-Za-z0-9]+$`);
          files.forEach(file => {
            if (exactPattern.test(file)) {
              try {
                fs.unlinkSync(path.join(imagesDir, file));
              } catch (e) {}
            }
          });
        } catch (e) {}

        const timestamp = Date.now();
        const fileName = `product-${prefix}-${timestamp}.${ext}`;
        const filePath = path.join(imagesDir, fileName);
        fs.writeFileSync(filePath, buffer);
        
        return `images/${fileName}`;
      }
      return null;
    };

    if (parsed.settings) {
      if (parsed.settings.logoImage && parsed.settings.logoImage.startsWith('data:image/')) {
        const logoPath = saveBase64Image(parsed.settings.logoImage, 'logo');
        if (logoPath) {
          parsed.settings.logoImage = logoPath;
        }
      }
      if (parsed.settings.faviconImage && parsed.settings.faviconImage.startsWith('data:image/')) {
        const faviconPath = saveBase64Image(parsed.settings.faviconImage, 'favicon');
        if (faviconPath) {
          parsed.settings.faviconImage = faviconPath;
        }
      }
    }

    // Save product images
    if (parsed.products && Array.isArray(parsed.products)) {
      parsed.products.forEach(product => {
        if (!product.images || !Array.isArray(product.images)) {
          product.images = product.image ? [product.image] : [];
        }

        // Ensure product.image is the first element of product.images
        if (product.image && product.images[0] !== product.image) {
          product.images = [product.image, ...product.images.filter(img => img !== product.image)];
        }

        // Process all gallery images
        product.images = product.images.map((img, idx) => {
          if (img && img.startsWith('data:image/')) {
            const prefix = idx === 0 ? product.id : `${product.id}-gallery-${idx}`;
            const savedPath = saveBase64ProductImage(img, prefix);
            if (savedPath) {
              if (idx === 0) {
                product.image = savedPath;
              }
              return savedPath;
            }
          }
          return img;
        });

        // Safe check for primary image if it was replaced with data:image outside images array
        if (product.image && product.image.startsWith('data:image/')) {
          const savedPath = saveBase64ProductImage(product.image, product.id);
          if (savedPath) {
            product.image = savedPath;
            product.images[0] = savedPath;
          }
        }
      });
    }

    // Clean up deleted products' pages and unused images
    if (oldProducts && oldProducts.length > 0) {
      const currentProductIds = new Set((parsed.products || []).map(p => p.id));
      
      // Build a set of all currently active images after processing
      const activeImages = new Set();
      if (parsed.products && Array.isArray(parsed.products)) {
        parsed.products.forEach(p => {
          if (p.image) activeImages.add(p.image);
          if (p.images && Array.isArray(p.images)) {
            p.images.forEach(img => {
              if (img) activeImages.add(img);
            });
          }
        });
      }
      if (parsed.settings) {
        if (parsed.settings.logoImage) activeImages.add(parsed.settings.logoImage);
        if (parsed.settings.faviconImage) activeImages.add(parsed.settings.faviconImage);
      }

      oldProducts.forEach(oldProd => {
        // 1. Delete static HTML product detail page if product was deleted
        if (!currentProductIds.has(oldProd.id)) {
          const productHtmlPath = path.join(__dirname, 'product', `${oldProd.id}.html`);
          if (fs.existsSync(productHtmlPath)) {
            try {
              fs.unlinkSync(productHtmlPath);
              console.log(`Cleaned up deleted product page: product/${oldProd.id}.html`);
            } catch (err) {
              console.error(`Failed to delete product page product/${oldProd.id}.html:`, err.message);
            }
          }
        }

        // 2. Identify all old images used by this product
        const oldImages = [];
        if (oldProd.image) oldImages.push(oldProd.image);
        if (oldProd.images && Array.isArray(oldProd.images)) {
          oldProd.images.forEach(img => {
            if (img && !oldImages.includes(img)) {
              oldImages.push(img);
            }
          });
        }

        // 3. Delete any of these old images that are no longer used by ANY active product/setting
        oldImages.forEach(img => {
          if (img && img.startsWith('images/product-') && !activeImages.has(img)) {
            const fullImagePath = path.join(__dirname, img);
            if (fs.existsSync(fullImagePath)) {
              try {
                fs.unlinkSync(fullImagePath);
                console.log(`Cleaned up unused/deleted product image: ${img}`);
              } catch (err) {
                console.error(`Failed to delete unused image ${img}:`, err.message);
              }
            }
          }
        });
      });
    }

    // Clean up reviews for deleted products
    if (parsed.reviews && Array.isArray(parsed.reviews)) {
      const currentProductIds = new Set((parsed.products || []).map(p => p.id));
      const beforeReviewsCount = parsed.reviews.length;
      parsed.reviews = parsed.reviews.filter(rev => !rev.productId || currentProductIds.has(rev.productId));
      if (parsed.reviews.length < beforeReviewsCount) {
        console.log(`Cleaned up ${beforeReviewsCount - parsed.reviews.length} orphaned reviews.`);
      }
    }

    // Write formatted site_data.js
    const fileContent = `const siteData = ${JSON.stringify(parsed, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n  module.exports = siteData;\n} else if (typeof window !== 'undefined') {\n  window.siteData = siteData;\n}\n`;
    
    fs.writeFileSync(dataFilePath, fileContent, 'utf-8');
    console.log('SUCCESS');
    
    // Clean up temp file
    try {
      fs.unlinkSync(tempFilePath);
    } catch (e) {
      // Ignore cleanup error
    }
  } catch (err) {
    console.error('Error saving data:', err.message);
    process.exit(1);
  }
} else if (action === 'submit-review') {
  try {
    const tempFilePath = process.argv[3];
    if (!tempFilePath) {
      console.error('Error: Temp file path not provided.');
      process.exit(1);
    }
    
    // Read the temp JSON file
    let rawData = fs.readFileSync(tempFilePath, 'utf-8');
    if (rawData.startsWith('\uFEFF')) {
      rawData = rawData.slice(1);
    }
    const newReview = JSON.parse(rawData);
    
    // Load existing database
    delete require.cache[require.resolve(dataFilePath)];
    const siteData = require(dataFilePath);
    
    if (!siteData.reviews) {
      siteData.reviews = [];
    }
    
    // Assign a unique review ID
    const timestamp = Date.now();
    newReview.id = 'rev-' + timestamp;

    // Decode review image if present
    if (newReview.imageData) {
      try {
        const matches = newReview.imageData.match(/^data:image\/([A-Za-z+]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const ext = matches[1] === 'jpeg' ? 'jpg' : (matches[1] || 'png');
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, 'base64');
          
          const reviewsDir = path.join(__dirname, 'images', 'reviews');
          if (!fs.existsSync(reviewsDir)) {
            fs.mkdirSync(reviewsDir, { recursive: true });
          }
          
          const fileName = `${newReview.id}.${ext}`;
          const filePath = path.join(reviewsDir, fileName);
          fs.writeFileSync(filePath, buffer);
          
          newReview.image = `images/reviews/${fileName}`;
        }
      } catch (imgErr) {
        console.error('Error saving review image:', imgErr.message);
      }
      
      delete newReview.imageData;
      delete newReview.imageName;
    }
    
    // Unshift to place new review at the beginning
    siteData.reviews.unshift(newReview);
    
    // Update matching product's reviewsCount and rating based on literal array of reviews
    if (siteData.products) {
      const product = siteData.products.find(p => p.id === newReview.productId);
      if (product) {
        const productReviews = siteData.reviews.filter(r => r.productId === product.id);
        product.reviewsCount = productReviews.length;
        if (productReviews.length > 0) {
          const totalRating = productReviews.reduce((sum, r) => sum + Number(r.rating), 0);
          product.rating = Number((totalRating / productReviews.length).toFixed(1));
        } else {
          product.rating = 5.0;
        }
      }
    }
    
    // Write formatted site_data.js
    const fileContent = `const siteData = ${JSON.stringify(siteData, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n  module.exports = siteData;\n} else if (typeof window !== 'undefined') {\n  window.siteData = siteData;\n}\n`;
    
    fs.writeFileSync(dataFilePath, fileContent, 'utf-8');
    console.log('SUCCESS SUBMIT REVIEW');
    
    // Clean up temp file
    try {
      fs.unlinkSync(tempFilePath);
    } catch (e) {
      // Ignore
    }
  } catch (err) {
    console.error('Error submitting review:', err.message);
    process.exit(1);
  }
} else {
  console.error('Error: Invalid action.', action);
  process.exit(1);
}
