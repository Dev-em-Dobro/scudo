interface ScudoShieldIconProps {
    className?: string;
}

export default function ScudoShieldIcon({ className }: Readonly<ScudoShieldIconProps>) {
    return (
        <svg
            viewBox="0 0 24 24"
            className={className}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            <path
                d="M12 2.25 19 5.4v5.37c0 5.2-3.22 9.9-7 11.48-3.78-1.58-7-6.28-7-11.48V5.4L12 2.25Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="m9.45 9.65-2.2 2.05 2.2 2.05M14.55 9.65l2.2 2.05-2.2 2.05M12.95 8.95l-1.9 5.6"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}