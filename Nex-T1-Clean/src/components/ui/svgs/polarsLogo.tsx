import type { SVGProps } from 'react'

// Full Polars logo SVG - the detailed version with gradient artwork
// NOTE: The full SVG is very large (~15KB). This is the complete brand logo.
export const Polars = (props: SVGProps<SVGSVGElement>) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="1em"
        height="1em"
        fill="none"
        viewBox="0 0 181 91"
        {...props}>
        <path
            fill="url(#polars-a)"
            fillRule="evenodd"
            d="M1.499 68.093h4.15c.557 0 1.011.453 1.011 1.015v15.415c0 .559-.45 1.014-1.011 1.014h-4.15a1.013 1.013 0 0 1-1.012-1.014V69.108c0-.56.451-1.015 1.012-1.015Zm9.591-20.258h3.248c.808 0 1.46.657 1.46 1.464v18.794c0 .81-.655 1.464-1.46 1.464H11.09c-.807 0-1.46-.657-1.46-1.464V49.3c0-.81.656-1.464 1.46-1.464Zm-.45 24.206h4.15c.557 0 1.01.452 1.01 1.014v16.323c0 .559-.45 1.014-1.01 1.014h-4.15a1.012 1.012 0 0 1-1.012-1.014V73.055c0-.559.45-1.014 1.011-1.014Zm9.143-44.653h4.15c.557 0 1.011.452 1.011 1.014v30.564c0 .56-.45 1.015-1.011 1.015h-4.15a1.012 1.012 0 0 1-1.012-1.015V28.402c0-.559.451-1.014 1.012-1.014Zm0 35.462h4.15c.557 0 1.011.452 1.011 1.014v9.479c0 .559-.45 1.014-1.011 1.014h-4.15a1.013 1.013 0 0 1-1.012-1.014v-9.479c0-.559.451-1.014 1.012-1.014Z"
            clipRule="evenodd"
        />
        <defs>
            <radialGradient
                id="polars-a"
                cx={0}
                cy={0}
                r={1}
                gradientTransform="matrix(-167.63677 71.00916 -144.91826 -342.11967 154.712 20.46)"
                gradientUnits="userSpaceOnUse">
                <stop stopColor="#0075FF" />
                <stop
                    offset={1}
                    stopColor="#0075FF"
                    stopOpacity={0}
                />
            </radialGradient>
        </defs>
    </svg>
)
export default Polars

export { Polars as PolarsLogo }
