# Event Tracking (BETA)

Events allow you to track specific interactions on your site, such as button clicks, file downloads, or form submissions, giving you deeper insights into user behavior.

## 1) Enable Events
Add `?events` to your Tinylytics script tag.

## 2) Tag Your Elements
Add `data-tinylytics-event="category.action"` to any HTML element.

## 3) See Real-time Stats
Events will appear automatically when triggered.

> This feature is currently in beta testing and may be subject to changes.

Event tracking allows you to capture specific user interactions on your website, such as button clicks, file downloads, or form submissions. This goes beyond simple page views to help you understand how visitors are engaging with your content.

## Enabling Event Tracking
To start tracking events, add the `?events` parameter to your existing Tinylytics embed script.

```html
<script src="https://tinylytics.app/embed/YOUR_UNIQUE_SITE_CODE.js?events"></script>
```

If you are already using other parameters (like `?kudos` or `?hits`), you can combine them:

```html
<script src="https://tinylytics.app/embed/YOUR_UNIQUE_SITE_CODE.js?events&kudos&hits"></script>
```

**Note:** When hit tracking is disabled (for example via your site settings or the `?ignore` parameter on the script URL), event tracking will not trigger either. Events are only sent when hit collection is enabled.

## How to Track Events
Once the script is updated, you can track events by adding specific `data-` attributes to any HTML element on your page (links, buttons, divs, etc.).

The script listens for clicks on these elements and automatically sends the event data to Tinylytics.

### Basic Usage
Use the `data-tinylytics-event` attribute to define the event name.

```html
<button data-tinylytics-event="button.subscribe">
  Subscribe
</button>
```

### Event Naming Convention
Event names must follow the `category.action` format.

- Good: `button.click`, `file.download`, `form.submit`, `video.play`
- Bad: `click`, `download`, `submit` (missing category)

The script will automatically convert arrows `->` to dots `.`, so `button->click` becomes `button.click`.

### Adding Event Values
You can optionally provide a value for the event using `data-tinylytics-event-value`. This is useful for distinguishing between similar events, like downloading different files.

```html
<a href="/guides/pricing.pdf"
   data-tinylytics-event="file.download"
   data-tinylytics-event-value="pricing-guide.pdf">
  Download Pricing Guide
</a>
```

## Examples
### Tracking File Downloads
```html
<a href="/assets/whitepaper.pdf"
   data-tinylytics-event="download.whitepaper"
   data-tinylytics-event-value="v1.0">
  Get Whitepaper
</a>
```

### Tracking External Links
```html
<a href="https://twitter.com/tinylytics"
   data-tinylytics-event="social.twitter"
   target="_blank">
  Follow us on Twitter
</a>
```

### Tracking Form Submissions
You can add the attribute to the submit button of a form:

```html
<form action="/subscribe" method="POST">
  <input type="email" name="email">
  <button type="submit" data-tinylytics-event="form.newsletter_signup">
    Join Newsletter
  </button>
</form>
```

## Advanced Configuration
### Using Beacons vs. Fetch
By default, Tinylytics uses the standard `fetch` API to send event data. This is reliable for most interactions. However, for links that navigate away from the current page (like external links), the browser might cancel the request before it completes.

To ensure events are sent even when the user leaves the page, enable Beacon mode by adding `?beacon` to your script URL.

```html
<script src="https://tinylytics.app/embed/YOUR_UNIQUE_SITE_CODE.js?events&beacon"></script>
```

This uses `navigator.sendBeacon`, which queues the data to be sent asynchronously by the browser, improving delivery when pages unload quickly.

**Note:** Beacons may be blocked by some privacy-focused browsers (like Brave) or ad-blocking extensions. If data completeness is critical, test both modes for your audience.

### Debouncing
To prevent accidental double-clicks from skewing your data, the script automatically debounces events. If a user clicks the same element multiple times rapidly, only one event is recorded every 500 milliseconds.
