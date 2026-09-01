import re

# 1. Read activity.html
with open('public/page/activity.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 2. Extract the Swiper initialization script
swiper_script_match = re.search(r'(window\.featuredSwiper\s*=\s*new\s*Swiper[\s\S]*?\}\);)', html)
if swiper_script_match:
    swiper_init_code = swiper_script_match.group(1)
    # Remove from html
    html = html.replace(swiper_init_code, '// Swiper initialization moved to activity-dynamic.js')

with open('public/page/activity.html', 'w', encoding='utf-8') as f:
    f.write(html)

# 3. Read activity-dynamic.js
with open('public/js/activity-dynamic.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 4. Replace the old Swiper update logic with the full initialization
# Look for: if (window.featuredSwiper) { window.featuredSwiper.update(); }
old_update_code = r'if\s*\(\s*window\.featuredSwiper\s*\)\s*\{\s*window\.featuredSwiper\.update\(\);\s*\}'

# The replacement includes destroying the old instance if it exists, then initializing a new one.
new_init_code = """
                if (window.featuredSwiper && window.featuredSwiper.destroy) {
                    window.featuredSwiper.destroy(true, true);
                }
                
                window.featuredSwiper = new Swiper(".featuredSwiper", {
                    loop: false, // Changed from true to false because dynamic loading with loop can cause duplicated slides bugs
                    slidesPerView: 1,
                    spaceBetween: 24,
                    speed: 800,
                    grabCursor: true,
                    autoplay: {
                        delay: 4000,
                        disableOnInteraction: false,
                        pauseOnMouseEnter: true,
                    },
                    navigation: {
                        nextEl: ".swiper-button-next",
                        prevEl: ".swiper-button-prev",
                    },
                    pagination: {
                        el: ".featured-pagination",
                        clickable: true,
                        dynamicBullets: true,
                    },
                    breakpoints: {
                        640: { slidesPerView: 2, spaceBetween: 20 },
                        1024: { slidesPerView: 3, spaceBetween: 28 },
                    },
                });
"""

if re.search(old_update_code, js):
    js = re.sub(old_update_code, new_init_code, js)
else:
    print("Warning: old update code not found in activity-dynamic.js")

with open('public/js/activity-dynamic.js', 'w', encoding='utf-8') as f:
    f.write(js)
