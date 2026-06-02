import { App } from "antd";
import { useEffect } from "react";
import { setMessageApi } from "../utils/appMessage";

export default function AppMessageBridge() {
  const { message } = App.useApp();

  useEffect(() => {
    setMessageApi(message);
  }, [message]);

  return null;
}
