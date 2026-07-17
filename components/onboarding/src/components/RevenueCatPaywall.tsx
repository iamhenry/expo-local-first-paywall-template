import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Purchases, { type CustomerInfo, type PurchasesOffering } from 'react-native-purchases';
import RevenueCatUI from 'react-native-purchases-ui';
import { RevenueCatPaywallProps } from '../types';

type PaywallState =
  | { status: 'loading' }
  | { status: 'ready'; offering: PurchasesOffering }
  | { status: 'failure' };

type TerminalOutcome = 'pending' | 'completed' | 'dismissed';

const hasEntitlement = (
  customerInfo: CustomerInfo,
  entitlementIdentifier: string,
) => customerInfo.entitlements.active[entitlementIdentifier] !== undefined;

const RevenueCatPaywall: React.FC<RevenueCatPaywallProps> = ({
  entitlementIdentifier,
  placementIdentifier,
  onComplete,
  onDismiss,
}) => {
  const [paywallState, setPaywallState] = useState<PaywallState>({ status: 'loading' });
  const isMountedRef = useRef(false);
  const preparationRequestIdRef = useRef(0);
  const terminalOutcomeRef = useRef<TerminalOutcome>('pending');

  const completeOnce = useCallback(() => {
    if (!isMountedRef.current || terminalOutcomeRef.current !== 'pending') {
      return;
    }

    terminalOutcomeRef.current = 'completed';
    onComplete?.();
  }, [onComplete]);

  const dismissOnce = useCallback(() => {
    if (!isMountedRef.current || terminalOutcomeRef.current !== 'pending') {
      return;
    }

    terminalOutcomeRef.current = 'dismissed';
    onDismiss?.();
  }, [onDismiss]);

  const preparePaywall = useCallback(async () => {
    const requestId = preparationRequestIdRef.current + 1;
    preparationRequestIdRef.current = requestId;

    if (terminalOutcomeRef.current !== 'pending') {
      return;
    }

    setPaywallState({ status: 'loading' });

    try {
      const customerInfo = await Purchases.getCustomerInfo();
      if (!isMountedRef.current || preparationRequestIdRef.current !== requestId || terminalOutcomeRef.current !== 'pending') {
        return;
      }

      if (hasEntitlement(customerInfo, entitlementIdentifier)) {
        completeOnce();
        return;
      }

      const offering = placementIdentifier
        ? await Purchases.getCurrentOfferingForPlacement(placementIdentifier)
        : (await Purchases.getOfferings()).current;

      if (!isMountedRef.current || preparationRequestIdRef.current !== requestId || terminalOutcomeRef.current !== 'pending') {
        return;
      }

      if (!offering) {
        setPaywallState({ status: 'failure' });
        return;
      }

      setPaywallState({ status: 'ready', offering });
    } catch {
      if (isMountedRef.current && preparationRequestIdRef.current === requestId && terminalOutcomeRef.current === 'pending') {
        setPaywallState({ status: 'failure' });
      }
    }
  }, [completeOnce, entitlementIdentifier, placementIdentifier]);

  useEffect(() => {
    isMountedRef.current = true;
    preparePaywall();

    return () => {
      isMountedRef.current = false;
      preparationRequestIdRef.current += 1;
    };
  }, [preparePaywall]);

  const handleDismiss = useCallback(async () => {
    if (!isMountedRef.current || terminalOutcomeRef.current !== 'pending') {
      return;
    }

    try {
      const customerInfo = await Purchases.getCustomerInfo();
      if (!isMountedRef.current || terminalOutcomeRef.current !== 'pending') {
        return;
      }

      if (hasEntitlement(customerInfo, entitlementIdentifier)) {
        completeOnce();
        return;
      }

      dismissOnce();
    } catch {
      dismissOnce();
    }
  }, [completeOnce, dismissOnce, entitlementIdentifier]);

  const handleCustomerInfoResult = useCallback((customerInfo: CustomerInfo) => {
    if (hasEntitlement(customerInfo, entitlementIdentifier)) {
      completeOnce();
    }
  }, [completeOnce, entitlementIdentifier]);

  if (paywallState.status === 'ready') {
    return (
      <RevenueCatUI.Paywall
        options={{ offering: paywallState.offering }}
        onPurchaseCompleted={({ customerInfo }) => handleCustomerInfoResult(customerInfo)}
        onRestoreCompleted={({ customerInfo }) => handleCustomerInfoResult(customerInfo)}
        onPurchaseCancelled={() => {}}
        onPurchaseError={() => {}}
        onRestoreError={() => {}}
        onDismiss={handleDismiss}
      />
    );
  }

  if (paywallState.status === 'failure') {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Unable to load subscription options.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={preparePaywall} activeOpacity={0.8}>
          <Text style={styles.primaryButtonText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={dismissOnce} activeOpacity={0.8}>
          <Text style={styles.secondaryButtonText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#2F4F2F" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: 'white',
  },
  message: {
    color: '#2F4F2F',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 24,
  },
  primaryButton: {
    minWidth: 180,
    borderRadius: 25,
    backgroundColor: '#2F4F2F',
    paddingHorizontal: 24,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    minWidth: 180,
    borderRadius: 25,
    paddingHorizontal: 24,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#2F4F2F',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RevenueCatPaywall;
