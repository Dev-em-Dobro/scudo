import Image from "next/image";

import scudoLogo from "@/app/assets/scudo-logo.png";
import scudoTitle from "@/app/assets/scudo-titulo.png";

interface BrandLogoProps {
    className?: string;
    logoClassName?: string;
    titleClassName?: string;
    priority?: boolean;
    /** Só o escudo, sem o texto SCUDO (ex.: header mobile). */
    compact?: boolean;
}

function joinClasses(...classes: Array<string | undefined>) {
    return classes.filter(Boolean).join(" ");
}

export default function BrandLogo({
    className,
    logoClassName,
    titleClassName,
    priority = false,
    compact = false,
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
            {!compact && (
                <Image
                    src={scudoTitle}
                    alt=""
                    aria-hidden="true"
                    className={joinClasses(
                        "-ml-3 h-5 w-auto shrink-0 object-left sm:-ml-4 lg:-ml-4",
                        titleClassName,
                    )}
                    priority={priority}
                />
            )}
        </div>
    );
}