let _messageApi = null;

export function setMessageApi(api) {
  _messageApi = api;
}

function getApi() {
  if (!_messageApi) {
    console.warn("[appMessage] message API chưa được khởi tạo – đảm bảo AppMessageBridge đã mount.");
  }
  return _messageApi;
}

export function showSuccessMessage(content, options = {}) {
  getApi()?.success({
    content,
    duration: options.duration ?? 4
  });
}

export function showErrorMessage(content, options = {}) {
  getApi()?.error({
    content,
    duration: options.duration ?? 4
  });
}

export function showInfoMessage(content, options = {}) {
  getApi()?.info({
    content,
    duration: options.duration ?? 4
  });
}

export function clearAllMessages() {
  getApi()?.destroy();
}
