import { Alert } from "react-native";

type ToastInput =
  | string
  | {
      title: string;
      description?: string;
    };

export const toast = (input: ToastInput) => {
  if (typeof input === "string") {
    Alert.alert(input);
    return;
  }
  Alert.alert(input.title, input.description);
};

toast.success = (message: string) => {
  Alert.alert("Success", message);
};

toast.error = (message: string) => {
  Alert.alert("Error", message);
};

toast.info = (message: string) => {
  Alert.alert("Info", message);
};
