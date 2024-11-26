const { Client } = require("node-ssdp");
const client = new Client();
const axios = require("axios");
const { xml2js } = require("xml-js");

const getDeviceData = async (url) => {
  try {
    const xmlText = await readXML(url);
    if (!xmlText) {
      return {};
    }

    // Phân tích cú pháp XML
    const result = xml2js(xmlText, { compact: true });

    const deviceInfo = result.root.device;

    // Lấy các trường cần thiết
    const deviceId =
      deviceInfo["sec:deviceID"]?._text ||
      deviceInfo.device_Id?._text ||
      deviceInfo.device_id?._text;

    const deviceType = deviceInfo.deviceType?._text;
    const friendlyName = deviceInfo.friendlyName?._text;
    const manufacturer = deviceInfo.manufacturer?._text;
    const modelName = deviceInfo.modelName?._text;

    return {
      deviceType,
      friendlyName,
      manufacturer,
      modelName,
      deviceId,
    };
  } catch (error) {
    console.log("Read xml error", error);

    return {};
  }
};

const readXML = async (url) => {
  try {
    const response = await axios.get(url);
    const xmlText = await response.data;

    return xmlText;
  } catch (error) {
    console.log("Read xml error", error.message, url);

    return null;
  }
};

function extractIp(url) {
  const regex = /http:\/\/([\d.]+):/; // Biểu thức chính quy để tìm địa chỉ IP
  const match = url.match(regex);
  return match ? match[1] : null; // Trả về địa chỉ IP nếu tìm thấy
}

console.log("Searching for devices on the network...");
const checkIfTV = (headers) => {
  const server = (headers.manufacturer || "").toLowerCase();
  const st = (headers.deviceType || "").toLowerCase();
  return (
    server.includes("tv") ||
    server.includes("samsung") ||
    server.includes("lg") ||
    server.includes("sony") ||
    st.includes("mediarenderer") ||
    st.includes("dial")
  );
};

// Bắt đầu tìm kiếm
client.on("response", async (headers, statusCode, rinfo) => {
  // console.log("headers", headers);
  const xmlData = await getDeviceData(headers.LOCATION);
  console.log("checkIfTV", checkIfTV(xmlData));
  const isTivi = checkIfTV(xmlData);
  if (isTivi) {
    console.log("xmlData", xmlData);
    console.log("ip", extractIp(headers.LOCATION));
  }
});

// Gửi yêu cầu tìm kiếm các thiết bị hỗ trợ SSDP
client.search("ssdp:all");

// Dừng tìm kiếm sau 5 giây
setTimeout(() => {
  client.stop();
  console.log("Scan complete.");
}, 5000);
