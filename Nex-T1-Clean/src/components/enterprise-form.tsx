import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import Link from 'next/link'

export const EnterpriseForm = () => {
    return (
        <div className="relative">
            <div
                aria-hidden
                className="mask-b-from-50% absolute -inset-6 px-6 pt-4">
                <div className="bg-card/75 ring-border size-full rounded-t-2xl shadow-xl shadow-black/10 ring-1" />
            </div>
            <form
                action=""
                className="**:[&>label]:block relative space-y-6 p-8 *:space-y-3">
                <div className="grid gap-3 *:space-y-3 sm:grid-cols-2">
                    <div>
                        <Label htmlFor="name">Full name</Label>
                        <Input
                            type="text"
                            id="name"
                            required
                        />
                    </div>

                    <div>
                        <Label htmlFor="email">Work Email</Label>
                        <Input
                            type="email"
                            id="email"
                            required
                        />
                    </div>
                </div>

                <div>
                    <Label htmlFor="country">Country/Region</Label>
                    <Select>
                        <SelectTrigger className="not-focus:ring-foreground/10! dark:bg-foreground/5 bg-card border-transparent shadow-sm ring-1">
                            <SelectValue placeholder="Select Country/Region" />
                        </SelectTrigger>
                        <SelectContent className="ring-border border-transparent ring-1">
                            <SelectItem value="1">🇨🇩 DR Congo</SelectItem>
                            <SelectItem value="2">🇺🇸 United States</SelectItem>
                            <SelectItem value="3">🇫🇷 France</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div>
                    <Label htmlFor="website">Company Website</Label>
                    <div className="relative">
                        <Input
                            type="url"
                            id="website"
                            className="pl-16"
                            placeholder="tailark.com"
                        />
                        <span className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm">https://</span>
                    </div>
                </div>

                <div>
                    <Label htmlFor="job">Job function</Label>
                    <Select>
                        <SelectTrigger className="not-focus:ring-foreground/10! bg-card dark:bg-foreground/5 border-transparent shadow-sm ring-1">
                            <SelectValue placeholder="Select Job Function" />
                        </SelectTrigger>
                        <SelectContent className="ring-border border-transparent ring-1">
                            <SelectItem value="1">Finance</SelectItem>
                            <SelectItem value="2">Education</SelectItem>
                            <SelectItem value="3">Legal</SelectItem>
                            <SelectItem value="4">More</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div>
                    <Label htmlFor="msg">Message</Label>
                    <Textarea
                        id="msg"
                        rows={3}
                    />
                </div>

                <div className="grid gap-6 sm:grid-cols-[1fr_auto]">
                    <p className="text-muted-foreground text-sm">
                        By submitting this form, you agree to our{' '}
                        <Link
                            href="#link"
                            className="text-primary underline">
                            Privacy Policy
                        </Link>
                    </p>
                    <Button className="max-sm:row-start-1">Get in touch</Button>
                </div>
            </form>
        </div>
    )
}