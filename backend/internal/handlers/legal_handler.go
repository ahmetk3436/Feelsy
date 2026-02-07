package handlers

import "github.com/gofiber/fiber/v2"

type LegalHandler struct{}

func NewLegalHandler() *LegalHandler {
	return &LegalHandler{}
}

func (h *LegalHandler) PrivacyPolicy(c *fiber.Ctx) error {
	html := `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Privacy Policy - Feelsy</title><style>body{font-family:-apple-system,system-ui,sans-serif;max-width:800px;margin:0 auto;padding:20px;color:#333;line-height:1.6}h1{color:#8B5CF6}h2{color:#7C3AED;margin-top:30px}</style></head><body><h1>Privacy Policy</h1><p><strong>Last updated:</strong> February 7, 2026</p><p>Feelsy ("we", "our", or "us") is committed to protecting your privacy.</p><h2>Information We Collect</h2><ul><li><strong>Account Information:</strong> Email address and encrypted password.</li><li><strong>Mood Data:</strong> Your daily mood check-ins and notes.</li><li><strong>Social Data:</strong> Friend connections and good vibes sent.</li><li><strong>Usage Data:</strong> App interaction data.</li></ul><h2>How We Use Your Information</h2><ul><li>To provide mood tracking and emotional insights</li><li>To enable friend connections and good vibes</li><li>To track your mood streaks</li><li>To generate personalized wellness insights</li></ul><h2>Data Storage & Security</h2><p>Stored securely with JWT authentication and encryption. Mood notes are filtered for safety.</p><h2>Third-Party Services</h2><ul><li><strong>RevenueCat:</strong> Subscription management.</li><li><strong>Apple Sign In:</strong> Email and name only.</li></ul><h2>Data Deletion</h2><p>Delete your account and all data from Settings.</p><h2>Children's Privacy</h2><p>Not intended for children under 13.</p><h2>Contact</h2><p>Email: <strong>ahmetk3436@gmail.com</strong></p></body></html>`
	c.Set("Content-Type", "text/html; charset=utf-8")
	return c.SendString(html)
}

func (h *LegalHandler) TermsOfService(c *fiber.Ctx) error {
	html := `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Terms of Service - Feelsy</title><style>body{font-family:-apple-system,system-ui,sans-serif;max-width:800px;margin:0 auto;padding:20px;color:#333;line-height:1.6}h1{color:#8B5CF6}h2{color:#7C3AED;margin-top:30px}</style></head><body><h1>Terms of Service</h1><p><strong>Last updated:</strong> February 7, 2026</p><h2>Use of Service</h2><p>Feelsy provides mood tracking and emotional wellness tools. Not a substitute for professional mental health services. Must be 13+.</p><h2>Content Guidelines</h2><ul><li>Be respectful when sending good vibes</li><li>No harassment or harmful content</li><li>Content is moderated for safety</li></ul><h2>Subscriptions</h2><ul><li>Premium via Apple's App Store. Cancel anytime.</li></ul><h2>Limitation of Liability</h2><p>Feelsy is provided "as is". Not medical advice.</p><h2>Contact</h2><p>Email: <strong>ahmetk3436@gmail.com</strong></p></body></html>`
	c.Set("Content-Type", "text/html; charset=utf-8")
	return c.SendString(html)
}
