import * as React from 'react'
import * as NavigationMenuPrimitive from '@radix-ui/react-navigation-menu'
import { cva } from 'class-variance-authority'
import { ChevronDownIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

const NavigationMenu = React.forwardRef<React.ElementRef<typeof NavigationMenuPrimitive.Root>, React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Root> & { viewport?: boolean }>(({ className, children, viewport = true, ...props }, ref) => (
    <NavigationMenuPrimitive.Root
        ref={ref}
        data-slot="navigation-menu"
        data-viewport={viewport}
        role="navigation"
        className={cn('group/navigation-menu relative flex max-w-max flex-1 items-center justify-center', className)}
        {...props}>
        {children}
        {viewport && <NavigationMenuViewport />}
    </NavigationMenuPrimitive.Root>
))
NavigationMenu.displayName = NavigationMenuPrimitive.Root.displayName

function NavigationMenuList({ className, ...props }: React.ComponentProps<typeof NavigationMenuPrimitive.List>) {
    return (
        <NavigationMenuPrimitive.List
            data-slot="navigation-menu-list"
            className={cn('group flex flex-1 list-none items-center justify-center gap-1', className)}
            {...props}
        />
    )
}

function NavigationMenuItem({ className, ...props }: React.ComponentProps<typeof NavigationMenuPrimitive.Item>) {
    return (
        <NavigationMenuPrimitive.Item
            data-slot="navigation-menu-item"
            className={cn('relative', className)}
            {...props}
        />
    )
}

const navigationMenuTriggerStyle = cva(
    'group inline-flex h-8 w-max items-center justify-center rounded-md px-4 py-1 text-sm text-muted-foreground font-medium hover:bg-foreground/5 hover:text-foreground focus:text-foreground disabled:pointer-events-none disabled:opacity-50 data-[state=open]:hover:bg-foreground/5 data-[state=open]:text-foreground data-[state=open]:focus:bg-foreground/5 data-[state=open]:bg-foreground/5 focus-visible:ring-ring/50 outline-none transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1'
)

function NavigationMenuTrigger({ className, children, ...props }: React.ComponentProps<typeof NavigationMenuPrimitive.Trigger>) {
    return (
        <NavigationMenuPrimitive.Trigger
            data-slot="navigation-menu-trigger"
            className={cn(navigationMenuTriggerStyle(), 'group', className)}
            {...props}>
            {children}{' '}
            <ChevronDownIcon
                className="relative top-px ml-1.5 size-3 opacity-75 transition duration-300 group-data-[state=open]:translate-y-px"
                aria-hidden="true"
                strokeWidth={2.5}
            />
        </NavigationMenuPrimitive.Trigger>
    )
}

function NavigationMenuContent({ className, ...props }: React.ComponentProps<typeof NavigationMenuPrimitive.Content>) {
    return (
        <NavigationMenuPrimitive.Content
            data-slot="navigation-menu-content"
            className={cn(
                'pt-22 left-0 top-0 w-full origin-top px-9 pb-9 md:absolute md:w-auto',
                'data-[motion=from-end]:animate-enter-from-right data-[motion=from-start]:animate-enter-from-left data-[motion=to-end]:animate-exit-to-right data-[motion=to-start]:animate-exit-to-left',
                'group-data-[viewport=false]/navigation-menu:text-popover-foreground group-data-[viewport=false]/navigation-menu:data-[state=open]:animate-in group-data-[viewport=false]/navigation-menu:data-[state=closed]:animate-out group-data-[viewport=false]/navigation-menu:data-[state=open]:fade-in-0 group-data-[viewport=false]/navigation-menu:data-[state=closed]:fade-out-0 **:data-[slot=navigation-menu-link]:focus:ring-0 **:data-[slot=navigation-menu-link]:focus:outline-none group-data-[viewport=false]/navigation-menu:ring-border group-data-[viewport=false]/navigation-menu:bg-popover group-data-[viewport=false]/navigation-menu:shadow-black/6.5 group-data-[viewport=false]/navigation-menu:-top-14 group-data-[viewport=false]/navigation-menu:-translate-x-1/3 group-data-[viewport=false]/navigation-menu:overflow-hidden group-data-[viewport=false]/navigation-menu:rounded-b-3xl group-data-[viewport=false]/navigation-menu:shadow-lg group-data-[viewport=false]/navigation-menu:ring-1 group-data-[viewport=false]/navigation-menu:duration-200',
                className
            )}
            {...props}
        />
    )
}

function NavigationMenuViewport({ className, ...props }: React.ComponentProps<typeof NavigationMenuPrimitive.Viewport>) {
    return (
        <div
            data-slot="navigation-menu-viewport-parent"
            className={cn('px-(--viewport-outer-px) min-w-312 has-data-[state=open]:grid-rows-[1fr] fixed inset-x-0 top-0 isolate z-50 mx-auto grid -translate-x-8 grid-rows-[0fr] transition-[grid-template-rows] duration-300 ease-out')}>
            <div className="-translate-x-12 overflow-hidden px-12 pb-32">
                <NavigationMenuPrimitive.Viewport
                    data-slot="navigation-menu-viewport"
                    className={cn('bg-popover text-popover-foreground h-(--radix-navigation-menu-viewport-height) ring-border md:w-(--radix-navigation-menu-viewport-width) relative w-full origin-top overflow-hidden rounded-b-3xl rounded-t p-0.5 shadow-2xl shadow-black/10 ring-1 transition-[width,height] duration-200', className)}
                    {...props}
                />
            </div>
        </div>
    )
}

function NavigationMenuLink({ className, ...props }: React.ComponentProps<typeof NavigationMenuPrimitive.Link>) {
    return (
        <NavigationMenuPrimitive.Link
            data-slot="navigation-menu-link"
            className={cn(
                "data-[active=true]:focus:bg-foreground/5 data-[active=true]:hover:bg-foreground/5 data-[active=true]:bg-foreground/2.5 data-[active=true]:text-foreground hover:bg-foreground/5 hover:text-foreground focus:bg-foreground/5 focus:text-foreground focus-visible:ring-ring/50 [&_svg:not([class*='text-'])]:text-muted-foreground flex flex-col gap-1 rounded-[11px] p-2 text-sm outline-none transition-all focus-visible:outline-1 focus-visible:ring-[3px] [&_svg:not([class*='size-'])]:size-4",
                className
            )}
            {...props}
        />
    )
}

function NavigationMenuIndicator({ className, ...props }: React.ComponentProps<typeof NavigationMenuPrimitive.Indicator>) {
    return (
        <NavigationMenuPrimitive.Indicator
            data-slot="navigation-menu-indicator"
            className={cn('data-[state=visible]:animate-in data-[state=hidden]:animate-out data-[state=hidden]:fade-out data-[state=visible]:fade-in z-1 top-full flex h-1.5 items-end justify-center overflow-hidden', className)}
            {...props}>
            <div className="bg-border relative top-[60%] h-2 w-2 rotate-45 rounded-tl-sm shadow-md" />
        </NavigationMenuPrimitive.Indicator>
    )
}

export { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuContent, NavigationMenuTrigger, NavigationMenuLink, NavigationMenuIndicator, NavigationMenuViewport, navigationMenuTriggerStyle }