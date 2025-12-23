"use strict";

function qs(sel) { return document.querySelector(sel); }
function qsa(sel) { return Array.from(document.querySelectorAll(sel)); }

function getQueryParam(name) {
	const params = new URLSearchParams(window.location.search);
	return params.get(name);
}

function getRedirectOverrideFromQuery() {
	// Support several param names for convenience
	const candidates = ["r", "url", "u", "claim", "redirect"];
	for (const key of candidates) {
		const val = getQueryParam(key);
		if (val) return val;
	}
	return null;
}

function isValidHttpUrl(value) {
	try {
		const url = new URL(value);
		return url.protocol === "http:" || url.protocol === "https:";
	} catch {
		return false;
	}
}

async function loadConfig() {
	const response = await fetch("./config.json", { cache: "no-store" });
	if (!response.ok) {
		throw new Error(`Failed to load config.json (${response.status})`);
	}
	return response.json();
}

function setStatus(message) {
	const el = document.getElementById("status");
	if (el) el.textContent = message;
}

function enableButton(onClick) {
	const button = document.getElementById("claim-button");
	if (!button) return;
	button.disabled = false;
	button.addEventListener("click", onClick, { once: true });
}

function launchConfetti(durationMs = 900) {
	const container = document.getElementById("confetti");
	if (!container) return;
	const colors = ["#ef4444", "#22c55e", "#f59e0b", "#38bdf8", "#a855f7", "#ffffff"];
	const count = 80;
	for (let i = 0; i < count; i++) {
		const piece = document.createElement("div");
		piece.className = "confetto";
		const size = 6 + Math.random() * 10;
		const startLeft = Math.random() * 100; // vw
		const drift = (Math.random() * 80 - 40); // px
		const rot = (Math.random() * 720 - 360) + "deg";
		piece.style.left = startLeft + "vw";
		piece.style.width = size + "px";
		piece.style.height = (size * 1.4) + "px";
		piece.style.background = colors[i % colors.length];
		piece.style.mixBlendMode = "screen";
		piece.style.setProperty("--x", drift + "px");
		piece.style.setProperty("--r", rot);
		const dur = 0.8 + Math.random() * 0.8;
		piece.style.animationDuration = dur + "s";
		container.appendChild(piece);
		setTimeout(() => piece.remove(), dur * 1000 + 100);
	}
	setTimeout(() => { container.innerHTML = ""; }, durationMs + 200);
}
function imageExists(url) {
	return new Promise(resolve => {
		const img = new Image();
		img.onload = () => resolve(true);
		img.onerror = () => resolve(false);
		img.src = url;
	});
}

async function detectImagesFromConfig(cfg) {
	if (!cfg || !Array.isArray(cfg.images)) return [];
	const strings = cfg.images.filter(x => typeof x === "string");
	const checked = await Promise.all(strings.map(async src => {
		const ok = await imageExists(src);
		return ok ? src : null;
	}));
	return checked.filter(Boolean);
}

async function detectImagesHeuristically() {
	const baseNames = [
		"santa1", "santa2"
	];
	const exts = ["png", "jpg"];
	const candidates = [];
	for (const base of baseNames) {
		for (const ext of exts) {
			candidates.push(`./images/${base}.${ext}`);
		}
	}
	const results = await Promise.all(candidates.map(src => imageExists(src).then(ok => ok ? src : null)));
	return results.filter(Boolean);
}

function renderGarland(images) {
	const list = document.getElementById("santa-garland");
	if (!list || !images || images.length === 0) return;
	list.innerHTML = "";
	const imgs = images.slice(0, 8);
	imgs.forEach((src, i) => {
		const li = document.createElement("li");
		// Stagger into two rows: insert a spacer after the first item
		if (i === 1) {
			const spacer = document.createElement("li");
			spacer.className = "spacer";
			list.appendChild(spacer);
		}
		if (i === 1) {
			li.classList.add("right");
		}
		const frame = document.createElement("div");
		frame.className = "bauble";
		const img = document.createElement("img");
		img.src = src;
		img.alt = "Santa";
		frame.appendChild(img);
		li.appendChild(frame);
		list.appendChild(li);
	});
}

document.addEventListener("DOMContentLoaded", async () => {
	setStatus("Preparing your gift…");
	let claimUrl = null;
	let cfg = null;

	try {
		const override = getRedirectOverrideFromQuery();
		if (override && isValidHttpUrl(override)) {
			claimUrl = override;
		} else {
			cfg = await loadConfig();
			if (cfg && typeof cfg.claimUrl === "string" && isValidHttpUrl(cfg.claimUrl)) {
				claimUrl = cfg.claimUrl;
			}
		}
	} catch (err) {
		console.error(err);
	}

	// Render Santa images if present
	try {
		const fromConfig = await detectImagesFromConfig(cfg);
		let images = fromConfig;
		if (!images || images.length === 0) {
			images = await detectImagesHeuristically();
		}
		renderGarland(images);
	} catch (e) {
		console.warn("Could not load Santa images", e);
	}

	if (!claimUrl) {
		setStatus("Gift link not configured yet.");
		return;
	}

	enableButton(() => {
		setStatus("Odvijanje darila… 🎁");
		launchConfetti(1600);
		setTimeout(() => {
			window.location.href = claimUrl;
		}, 1600);
	});
	setStatus("");
});


