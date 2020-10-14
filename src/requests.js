const axios = require('axios').default;
const helpers = require('./helpers.js');

getProductResults = async (_identifier, _page = 1) => {
    return await axios({
        method: 'get',
        url: `https://api.bestbuy.com/v1/products((categoryPath.id=${_identifier}))`,
        params: {
            apiKey: helpers.apiKey,
            sort: 'bestSellingRank.asc',
            show: 'details,categoryPath.name,color,customerReviewAverage,customerReviewCount,features.feature,image,includedItemList.includedItem,inStoreAvailability,longDescription,manufacturer,modelNumber,name,onlineAvailability,regularPrice,relatedProducts.sku,salePrice,shortDescription,sku,thumbnailImage,type,upc,url',
            format: 'json',
            pageSize: '100',
            page: _page
        }
    });
}

getStoreResults = async (_identifier, _skus, _page = 1) => {
    return await axios({
        method: 'get',
        url: `https://api.bestbuy.com/v1/stores((region=${_identifier}))+products(sku%20in%20(${_skus}))`,
        params: {
            apiKey: helpers.apiKey,
            show: 'products.sku,storeId,name,region,city,lat,lng,address,hours',
            page: _page,
            format: 'json',
        },
    });
}

module.exports.getProductResults = getProductResults;
module.exports.getStoreResults = getStoreResults;