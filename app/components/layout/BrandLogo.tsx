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
            className={joinClasses("flex items-center gap-0", className)}
            role="img"
            aria-label="Scudo"
        >
            <Image
                src={scudoLogo}
                alt=""
                aria-hidden="true"
                className={joinClasses("h-12 w-12 shrink-0 object-contain object-left", logoClassName)}
                priority={priority}
            />
            {/* Margem negativa compensa padding transparente nos PNGs (logo + título) */}
            <Image
                src={scudoTitle}
                alt=""
                aria-hidden="true"
                className={joinClasses(
                    "-ml-2 h-5 w-auto shrink-0 object-left sm:-ml-3 lg:-ml-3.5",
                    titleClassName,
                )}
                priority={priority}
            />
        </div>
    );
}