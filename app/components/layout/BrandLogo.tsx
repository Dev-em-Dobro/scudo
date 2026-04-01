import Image from "next/image";

import scudoLogo from "@/app/assets/scudo-logo.png";
import scudoTitle from "@/app/assets/scudo-titulo.png";

interface BrandLogoProps {
    className?: string;
    logoClassName?: string;
    titleClassName?: string;
    priority?: boolean;
}

function joinClasses(...classes: Array<string | undefined>) {
    return classes.filter(Boolean).join(" ");
}

export default function BrandLogo({
    className,
    logoClassName,
    titleClassName,
    priority = false,
}: Readonly<BrandLogoProps>) {
    return (
        <div
            className={joinClasses("flex items-center", className)}
            role="img"
            aria-label="Scudo"
        >
            <Image
                src={scudoLogo}
                alt=""
                aria-hidden="true"
                className={joinClasses("h-12 w-12 object-contain", logoClassName)}
                priority={priority}
            />
            <Image
                src={scudoTitle}
                alt=""
                aria-hidden="true"
                className={joinClasses("h-5 w-auto", titleClassName)}
                priority={priority}
            />
        </div>
    );
}