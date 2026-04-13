import React, { useCallback } from 'react';
import { Modal, View, ActivityIndicator, StyleSheet } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

type RazorpayWebViewProps = {
  visible: boolean;
  options: {
    key: string;
    amount: number;
    currency: string;
    order_id: string;
    name: string;
    description: string;
    prefill?: { name?: string; email?: string; contact?: string };
    theme?: { color?: string };
  };
  onSuccess: (data: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => void;
  onCancel: () => void;
  onError: (error: string) => void;
};

export function RazorpayWebView({
  visible,
  options,
  onSuccess,
  onCancel,
  onError,
}: RazorpayWebViewProps) {
  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        console.log('[RazorpayWebView] message:', data.type);
        if (data.type === 'success') {
          onSuccess(data.payload);
        } else if (data.type === 'cancel') {
          onCancel();
        } else if (data.type === 'error') {
          onError(data.message || 'Payment failed');
        }
      } catch {
        onError('Unexpected payment error');
      }
    },
    [onSuccess, onCancel, onError]
  );

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <style>
    body { margin:0; display:flex; align-items:center; justify-content:center;
           height:100vh; background:#f8fafc; font-family:system-ui; }
    .loading { color:#64748b; font-size:16px; }
  </style>
</head>
<body>
  <div class="loading">Opening payment...</div>
  <script>
    var options = ${JSON.stringify({
      key: options.key,
      amount: options.amount,
      currency: options.currency,
      order_id: options.order_id,
      name: options.name,
      description: options.description,
      prefill: options.prefill || {},
      theme: options.theme || {},
    })};

    options.handler = function(response) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'success',
        payload: {
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature
        }
      }));
    };

    options.modal = {
      ondismiss: function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'cancel' }));
      },
      escape: true,
      confirm_close: true
    };

    try {
      var rzp = new Razorpay(options);
      rzp.on('payment.failed', function(resp) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'error',
          message: resp.error ? resp.error.description : 'Payment failed'
        }));
      });
      rzp.open();
    } catch(e) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'error',
        message: e.message || 'Failed to initialize Razorpay'
      }));
    }
  </script>
</body>
</html>`;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        <WebView
          source={{ html }}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          onMessage={handleMessage}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loader}>
              <ActivityIndicator size="large" color="#2563eb" />
            </View>
          )}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loader: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
});
