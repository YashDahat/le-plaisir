package com.webappfoundation.plaisir;

import com.webappfoundation.model.Product;
import com.webappfoundation.plaisir.PlaisirModel.*;
import com.webappfoundation.repository.ProductRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Idempotent demo data for Le Plaisir. Dish names come from public sources (LBB, District, Google reviews).
 * Prices are INDICATIVE demo values (priceConfirmed=false) until the owner confirms them.
 */
@Component
@Order(20)
public class PlaisirSeeder {
    private static final Logger log = LoggerFactory.getLogger(PlaisirSeeder.class);

    private final ProductRepository products;
    private final DishInfoRepo dishes;
    private final FlavourRepo flavours;
    private final PickupSettingsRepo settings;
    private final CapacityRepo capacity;
    private final StoryRepo story;
    private int sort = 0;

    public PlaisirSeeder(ProductRepository products, DishInfoRepo dishes, FlavourRepo flavours,
                         PickupSettingsRepo settings, CapacityRepo capacity, StoryRepo story) {
        this.products = products; this.dishes = dishes; this.flavours = flavours;
        this.settings = settings; this.capacity = capacity; this.story = story;
    }

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void seed() {
        if (dishes.count() > 0) return;
        log.info("Seeding Le Plaisir demo menu");
        String P = "Patisserie";
        dish("Espresso Panna Cotta", P, 260, Diet.VEG, b -> b.signature(true).inVitrineToday(true).shortNote("Reviewers call it the best dessert on the menu"));
        dish("Blueberry Cheesecake (slice)", P, 320, Diet.EGG, b -> b.signature(true).inVitrineToday(true));
        dish("New York Baked Cheesecake (slice)", P, 300, Diet.EGG, b -> b.inVitrineToday(true));
        dish("Hazelnut Cheesecake (slice)", P, 320, Diet.EGG, b -> b);
        dish("Sachertorte (slice)", P, 290, Diet.EGG, b -> b.inVitrineToday(true));
        dish("Dark Chocolate & Orange Mousse Cake (slice)", P, 290, Diet.EGG, b -> b);
        dish("Banana Nutella Crepe", P, 280, Diet.EGG, b -> b.signature(true));
        dish("Macaron box of 6", "Macaron boxes", 540, Diet.EGG, b -> b.shortNote("Pick your flavours"));
        dish("Macaron box of 12", "Macaron boxes", 1020, Diet.EGG, b -> b.shortNote("Pick your flavours"));
        dish("Whole Blueberry Cheesecake (1 kg)", "Whole cakes", 2400, Diet.EGG, b -> b.leadHours(24).shortNote("Order a day ahead"));
        dish("Whole Sachertorte (1 kg)", "Whole cakes", 2200, Diet.EGG, b -> b.leadHours(24).shortNote("Order a day ahead"));

        dish("Sourdough Bread with butter", "Breakfast", 180, Diet.VEG, b -> b);
        dish("Omelette with Olives & Jalapenos", "Breakfast", 290, Diet.EGG, b -> b);
        dish("Breakfast Muffin", "Breakfast", 150, Diet.EGG, b -> b);

        String S = "Sandwiches & croissants";
        dish("Chicken Pesto Sandwich", S, 360, Diet.NON_VEG, b -> b);
        dish("Chicken Mayo Sandwich", S, 340, Diet.NON_VEG, b -> b);
        dish("Meat Loader Sandwich (chicken & ham)", S, 420, Diet.NON_VEG, b -> b);
        dish("In-house Chicken Sausages", S, 320, Diet.NON_VEG, b -> b.signature(true));

        portioned("Penne Alfredo", "Pasta", 320, 460, Diet.VEG, false);
        portioned("Lemon Butter Garlic Pasta", "Pasta", 320, 460, Diet.VEG, false);
        portioned("Pesto Pasta", "Pasta", 340, 480, Diet.VEG, false);
        dish("Veg & Feta Pizza", "Pizza", 520, Diet.VEG, b -> b.signature(true));
        portioned("Grilled Chicken with Mashed Potatoes & Harissa", "Mains", 420, 580, Diet.NON_VEG, true);
        portioned("Roasted Chicken", "Mains", 440, 600, Diet.NON_VEG, false);
        dish("Chicken & Iceberg Salad, kaffir-lime dressing", "Mains", 340, Diet.NON_VEG, b -> b);

        dish("OG Plain Salted Fries", "Sides", 190, Diet.VEG, b -> b);
        dish("Pull-apart Garlic Bread", "Sides", 240, Diet.VEG, b -> b);
        dish("Herbed Garlic Bread with Cheese", "Sides", 260, Diet.VEG, b -> b);
        dish("Mushrooms in Cream Sauce", "Sides", 290, Diet.VEG, b -> b);
        dish("Cheese & Mushroom Stuffed Potato", "Sides", 290, Diet.VEG, b -> b);

        dish("Cinnamon Coffee", "Drinks", 240, Diet.VEG, b -> b);
        dish("Strawberry-Blueberry-Banana Smoothie", "Drinks", 280, Diet.VEG, b -> b);
        dish("Iced Tea", "Drinks", 200, Diet.VEG, b -> b);

        LocalTime from = LocalTime.of(11, 30), to = LocalTime.of(15, 30);
        dish("Sandwich set: Chicken Pesto Sandwich + Fries + Iced Tea", "Desk lunch", 590, Diet.NON_VEG, b -> b.availableFrom(from).availableTo(to).shortNote("Weekday desk lunch"));
        dish("Pasta set: Penne Alfredo (small) + Garlic Bread + Iced Tea", "Desk lunch", 590, Diet.VEG, b -> b.availableFrom(from).availableTo(to).shortNote("Weekday desk lunch"));

        request("Table request", "table");
        request("Team lunch request", "gathering");
        request("Large table request (11+ guests)", "gathering");

        flavours.save(MacaronFlavour.builder().name("Rose").colourHex("#E8A3B5").sortOrder(1).build());
        flavours.save(MacaronFlavour.builder().name("Coffee").colourHex("#8A5A3C").sortOrder(2).build());

        if (settings.count() == 0) settings.save(PickupSettings.builder().id(1L).build());
        if (capacity.count() == 0) {
            List<TableSlotCapacity> rows = new ArrayList<>();
            for (int d = 1; d <= 7; d++)
                for (LocalTime t = LocalTime.of(8, 0); !t.isAfter(LocalTime.of(21, 30)); t = t.plusMinutes(30))
                    rows.add(TableSlotCapacity.builder().weekday(d).slotStart(t).covers(24).build());
            capacity.saveAll(rows);
        }
        if (story.count() == 0) {
            story.save(StoryBeat.builder().yearLabel("2012").title("Bhandarkar Road").sortOrder(1).sourceNote("LBB")
                    .body("Le Plaisir opened in 2012 in small premises on Bhandarkar Road.").build());
            story.save(StoryBeat.builder().yearLabel("Before the kitchen").title("An engineer turned cook").sortOrder(2).sourceNote("LBB")
                    .body("Chef and founder Siddharth Mahadik studied marine engineering, trained at Le Cordon Bleu and cooked in restaurants in Sydney before coming home to open his own place.").build());
            story.save(StoryBeat.builder().yearLabel("Prabhat Road").title("A bigger home, a counter at the door").sortOrder(3).sourceNote("LBB")
                    .body("The bistro moved to a larger space on Prabhat Road in Deccan Gymkhana, with the patisserie counter at the entrance.").build());
            story.save(StoryBeat.builder().yearLabel("Today").title("Open every day").sortOrder(4).sourceNote("Google")
                    .body("All-day breakfast, croissant sandwiches, pastas, seasonal dishes and a patisserie. Open daily 8 am to 10:45 pm.").build());
        }
    }

    private void request(String name, String workflow) {
        Product p = save(name, "Requests", 0, workflow);
        dishes.save(DishInfo.builder().productId(p.getId()).requestOnly(true).diet(Diet.VEG).sortOrder(900).build());
    }

    private void portioned(String name, String cat, int small, int large, Diet diet, boolean sig) {
        String key = slug(name);
        for (String[] pr : new String[][]{{"Small", String.valueOf(small)}, {"Large", String.valueOf(large)}}) {
            Product p = save(name + " (" + pr[0] + ")", cat, Integer.parseInt(pr[1]), PlaisirWorkflowSeeder.PICKUP);
            dishes.save(DishInfo.builder().productId(p.getId()).groupKey(key).portion(pr[0]).diet(diet).signature(sig)
                    .sortOrder(sort++).build());
        }
    }

    private void dish(String name, String cat, int price, Diet diet, java.util.function.UnaryOperator<DishInfo.DishInfoBuilder> cfg) {
        Product p = save(name, cat, price, PlaisirWorkflowSeeder.PICKUP);
        dishes.save(cfg.apply(DishInfo.builder().productId(p.getId()).diet(diet).sortOrder(sort++)).build());
    }

    private Product save(String name, String cat, int price, String workflow) {
        Instant now = Instant.now();
        return products.save(Product.builder().name(name).slug(slug(name)).price(BigDecimal.valueOf(price)).category(cat)
                .workflowCode(workflow).active(true).createdAt(now).updatedAt(now).build());
    }

    static String slug(String s) {
        return s.toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
    }
}
