interface HandlerOptions {
	req: any;
	res: any;
	log: (arg0: any) => void;
	error: (arg0: any) => void;
}

export default function handler(options: HandlerOptions): any;
