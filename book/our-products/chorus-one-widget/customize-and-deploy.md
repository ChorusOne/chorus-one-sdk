---
metaLinks:
  alternates:
    - >-
      https://app.gitbook.com/s/KGu77aAU8HQJ5FTwSgOi/our-products/chorus-one-widget/customize-and-deploy
---

# Customize and Deploy

**Tailor the staking experience to your brand.** The Chorus One Widget Builder lets you seamlessly apply your own design elements, colors, and style, so the earn section feels fully native to your platform and delivers a consistent, branded user journey.

### Access the Widget Builder

The Chorus One Widget Builder can be easily accessed at [widget.chorus.one](https://widget.chorus.one/)

<figure><img src="../../.gitbook/assets/image (33).png" alt="" width="563"><figcaption></figcaption></figure>

### Customize&#x20;

The left sidebar provides all customization options. Changes are applied in real time so you can preview how the Chorus One Widget will appear within your application.

**Accent Color**

* Customize the accent to match with your brand’s primary color.
* Color tones can be adjusted directly through a palette, enter a HEX value or RGB values&#x20;

**Brand Logo**

* Displaying your own logo by updating the URL.
* Default: Leave the URL field empty to display no logo.

**Networks:**

* Select the desired networks you want to offer in your platform
* Default: All available networks will be shown to users

**Referrer Code (optional):**

* Enter an identifier to track reference across all networks

### Deploy with 1-Line Code

{% hint style="warning" %}
Prerequisite: Please contact Chorus One team at StakingBOS@bitwiseinvestments.com to whitelist your domain.
{% endhint %}

After customizing the widget to match your branding, you can simply copy the intergration code into your platform by embedding the widget URL inside an `<iframe>`. The widget is framework-agnostic and works seamlessly across any tech stack, including no-code platforms.

```
<iframe 
  src="https://widget-staging.chorus.one/eth/stake?primaryColor=%232a2d2d&bgColor=%23FFFFFF&textColor=%23000000"
  width="600" 
  height="900" 
  frameborder="0"
></iframe>
```

