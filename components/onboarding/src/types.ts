import type { ReactElement } from 'react';

export interface OnboardingTheme {
  backgroundColor?: string;
  titleColor?: string;
  descriptionColor?: string;
  buttonBackgroundColor?: string;
  buttonTextColor?: string;
  progressDotColor?: string;
  progressDotActiveColor?: string;
  closeButtonColor?: string;
}

export interface OnboardingSlideData {
  id: string;
  media: {
    type: 'image' | 'video';
    source: any; // require() asset
    autoPlay?: boolean; // For videos (default: true)
    loop?: boolean; // For videos (default: true)
    muted?: boolean; // For videos (default: true)
    width?: number; // Custom width in pixels
    height?: number; // Custom height in pixels
    borderRadius?: number; // Custom border radius in pixels
  };
  title: string;
  description: string;
  animation?: 'fadeIn' | 'slideUp' | 'scaleIn';
}

export interface PaywallInjectedProps {
  onComplete?: () => void;
  onDismiss?: () => void;
}

export interface RevenueCatPaywallProps extends PaywallInjectedProps {
  entitlementIdentifier: string;
  placementIdentifier?: string;
}

export interface OnboardingFlowProps {
  slides: OnboardingSlideData[];
  visible: boolean;
  onComplete: () => void;
  onPaywallDismiss?: () => void;
  closeable?: boolean;
  showProgress?: boolean;
  theme?: OnboardingTheme;
  showPaywall?: boolean;
  paywallComponent?: ReactElement<PaywallInjectedProps>;
}

export interface OnboardingModalProps {
  visible: boolean;
  slides: OnboardingSlideData[];
  currentSlide: number;
  onNext: () => void;
  onClose?: () => void;
  closeable: boolean;
  showProgress: boolean;
  theme?: OnboardingTheme;
  showPaywall?: boolean;
  paywallComponent?: ReactElement<PaywallInjectedProps>;
}

export interface OnboardingSlideProps {
  slide: OnboardingSlideData;
  isActive: boolean;
  theme?: OnboardingTheme;
}
