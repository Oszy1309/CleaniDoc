import React, { useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import SignatureCanvas from 'react-native-signature-canvas';

export default function SignatureModal({ visible, onClose, onSave }) {
  const signatureRef = useRef(null);

  const handleOK = (signature) => {
    if (!signature) {
      Alert.alert('Fehler', 'Bitte unterschreiben Sie zuerst');
      return;
    }
    onSave(signature);
    onClose();
  };

  const handleClear = () => {
    signatureRef.current?.clearSignature();
  };

  const handleEmpty = () => {
    Alert.alert('Fehler', 'Bitte unterschreiben Sie zuerst');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Unterschrift</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.instruction}>
          Bitte unterschreiben Sie zur Bestätigung der erledigten Arbeit
        </Text>

        <View style={styles.signatureContainer}>
          <SignatureCanvas
            ref={signatureRef}
            onOK={handleOK}
            onEmpty={handleEmpty}
            descriptionText=""
            clearText="Löschen"
            confirmText="Bestätigen"
            webStyle={`
              .m-signature-pad {
                box-shadow: none;
                border: 2px solid #e0e0e0;
                border-radius: 8px;
              }
              .m-signature-pad--body {
                border: none;
              }
              .m-signature-pad--footer {
                display: none;
              }
            `}
          />
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={handleClear}
          >
            <Text style={styles.buttonTextSecondary}>Löschen</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary]}
            onPress={() => signatureRef.current?.readSignature()}
          >
            <Text style={styles.buttonTextPrimary}>Bestätigen</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 24,
    color: '#666',
  },
  instruction: {
    padding: 20,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  signatureContainer: {
    flex: 1,
    margin: 20,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: '#f0f0f0',
  },
  buttonPrimary: {
    backgroundColor: '#4CAF50',
  },
  buttonTextSecondary: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextPrimary: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
