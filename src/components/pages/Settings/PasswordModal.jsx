import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Lock } from "lucide-react"
import { showToast } from "@/utils/toast"

const PasswordModal = ({ open, onOpenChange, onConfirm }) => {
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)

    const CORRECT_PASSWORD = "FINAC@9990"

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)

        // Simulate a small delay for better UX
        await new Promise(resolve => setTimeout(resolve, 300))

        if (password === CORRECT_PASSWORD) {
            showToast.success("Password verified successfully")
            setPassword("")
            onConfirm(true)
            onOpenChange(false)
        } else {
            showToast.error("Incorrect password. Please try again.")
            setPassword("")
        }

        setLoading(false)
    }

    const handleCancel = () => {
        setPassword("")
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] bg-white dark:bg-[#1e1e1e] border-gray-200 dark:border-gray-700">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                        <Lock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        Authentication Required
                    </DialogTitle>
                    <DialogDescription className="text-gray-600 dark:text-gray-400">
                        Please enter the password to save settings changes.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Password
                            </label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Enter password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="bg-white dark:bg-[#242424] 
                                         border-gray-500 dark:border-gray-600
                                         text-gray-900 dark:text-gray-100
                                         placeholder:text-gray-400 dark:placeholder:text-gray-500
                                         focus:ring-2 focus:ring-blue-500"
                                autoFocus
                                required
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleCancel}
                            className="border-gray-500 dark:border-gray-600 
                                     text-gray-700 dark:text-gray-300 
                                     hover:bg-gray-100 dark:hover:bg-[#242424]"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading || !password}
                            className="main-bg text-white"
                        >
                            {loading ? 'Verifying...' : 'Verify & Save'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

export default PasswordModal