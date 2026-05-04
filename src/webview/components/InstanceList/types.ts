import type { InlineLaunchConfig } from '../../App';
import type { MultipassCapabilities } from '../../../utils/multipassVersion';

export interface DistroIconUris {
	ubuntuIconUri: string;
	ubuntuDarkIconUri: string;
	fedoraIconUri: string;
	fedoraDarkIconUri: string;
	debianIconUri: string;
	debianDarkIconUri: string;
}

export interface EmptyInstanceStateProps extends DistroIconUris {
	multipassCapabilities: MultipassCapabilities;
	onCreateCloudInitInstance: () => void;
	onCreateProfileInstance: () => void;
	onLaunchFromInlineForm: (config: InlineLaunchConfig) => void;
	onOptimisticLaunch: (launch: { name: string; release: string }) => void;
}

export interface InlineLaunchFormProps extends DistroIconUris {
	mode: 'quick' | 'custom';
	multipassCapabilities: MultipassCapabilities;
	onBack: () => void;
	onLaunchFromInlineForm: (config: InlineLaunchConfig) => void;
	onOptimisticLaunch: (launch: { name: string; release: string }) => void;
}

export interface LaunchOptionsPanelProps {
	onQuick: () => void;
	onCustom: () => void;
	onCreateCloudInitInstance: () => void;
	onCreateProfileInstance: () => void;
	onBack?: () => void;
}
