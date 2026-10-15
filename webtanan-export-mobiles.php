<?php
/*
Plugin Name: Webtanan Export Orders (CSV with UTF-8)
Plugin URI: https://webtanan.com
Description: Export all WooCommerce orders with phone, first name, last name into a CSV file. (Supports Persian names)
Version: 1.0.1
Author: وب تنان
Author URI: https://webtanan.com
License: GPL2
*/

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Main plugin class.
 *
 * The plugin used to declare global functions. If two copies of the plugin were
 * active (for example webtanan-export-mobiles and webtanan-export-mobiles-main),
 * PHP stopped with a "Cannot redeclare" fatal error. Keeping the implementation
 * inside a uniquely named class prevents collisions with the legacy functions.
 */
if (!class_exists('Webtanan_Export_Mobiles_Plugin', false)) {
    final class Webtanan_Export_Mobiles_Plugin {
        /**
         * Register initialization after all plugins have been loaded.
         *
         * Delaying initialization lets us detect an older copy of this plugin
         * regardless of which plugin directory WordPress loads first.
         */
        public static function bootstrap() {
            add_action('plugins_loaded', array(__CLASS__, 'init'), 20);
        }

        /**
         * Initialize this copy only when a legacy copy is not already active.
         */
        public static function init() {
            if (
                function_exists('webtanan_export_orders_add_menu') ||
                function_exists('webtanan_export_orders_render_page') ||
                function_exists('webtanan_export_orders_generate_file')
            ) {
                return;
            }

            add_action('admin_menu', array(__CLASS__, 'add_menu'));
        }

        /**
         * Add plugin page under Tools.
         */
        public static function add_menu() {
            add_submenu_page(
                'tools.php',
                'خروجی سفارشات',
                'خروجی سفارشات',
                'manage_woocommerce',
                'webtanan-export-orders',
                array(__CLASS__, 'render_page')
            );
        }

        /**
         * Render admin page.
         */
        public static function render_page() {
            if (!current_user_can('manage_woocommerce')) {
                wp_die('دسترسی غیر مجاز');
            }

            $notice = '';
            $download_url = '';

            if (isset($_POST['webtanan_export_orders_submit'])) {
                check_admin_referer('webtanan_export_orders_action', 'webtanan_export_orders_nonce');
                $result = self::generate_file();

                if ($result['success']) {
                    $notice = sprintf('فایل با موفقیت ساخته شد. تعداد سفارشات: %d', intval($result['count']));
                    $download_url = $result['url'];
                } else {
                    $notice = $result['message'];
                }
            }

            echo '<div class="wrap">';
            echo '<h1>خروجی سفارشات ووکامرس</h1>';

            if (!empty($notice)) {
                $class = $download_url ? 'updated notice' : 'error notice';
                echo '<div class="' . esc_attr($class) . '"><p>' . esc_html($notice) . '</p></div>';
            }

            if ($download_url) {
                echo '<p><a class="button button-primary" href="' . esc_url($download_url) . '" target="_blank">دانلود فایل</a></p>';
            }

            echo '<form method="post">';
            wp_nonce_field('webtanan_export_orders_action', 'webtanan_export_orders_nonce');
            echo '<p>با کلیک روی دکمه زیر، تمام اطلاعات سفارشات ووکامرس شامل شماره تماس، نام و نام خانوادگی به صورت فایل متنی یا فایل اکسل ذخیره می‌شوند.</p>';
            echo '<p><input type="submit" class="button button-secondary" name="webtanan_export_orders_submit" value="ساخت فایل خروجی"></p>';
            echo '</form>';
            echo '</div>';
        }

        /**
         * Generate UTF-8 CSV file.
         */
        public static function generate_file() {
            global $wpdb;

            $query = "
                SELECT
                    pm.meta_value AS billing_phone,
                    pm1.meta_value AS billing_first_name,
                    pm2.meta_value AS billing_last_name
                FROM {$wpdb->postmeta} pm
                INNER JOIN {$wpdb->posts} p ON p.ID = pm.post_id
                LEFT JOIN {$wpdb->postmeta} pm1 ON p.ID = pm1.post_id AND pm1.meta_key = '_billing_first_name'
                LEFT JOIN {$wpdb->postmeta} pm2 ON p.ID = pm2.post_id AND pm2.meta_key = '_billing_last_name'
                WHERE pm.meta_key = '_billing_phone'
                  AND pm.meta_value IS NOT NULL
                  AND pm.meta_value <> ''
                  AND p.post_type = 'shop_order'
            ";
            $results = $wpdb->get_results($query);

            if (empty($results)) {
                return array(
                    'success' => false,
                    'message' => 'هیچ اطلاعاتی پیدا نشد.',
                );
            }

            $output = array();
            $seen_phones = array();

            foreach ($results as $row) {
                $phone = trim(preg_replace('/\s+/', '', $row->billing_phone));
                $name = trim($row->billing_first_name);
                $family = trim($row->billing_last_name);

                if ($phone && !in_array($phone, $seen_phones, true)) {
                    $output[] = "$phone, $name $family";
                    $seen_phones[] = $phone;
                }
            }

            $upload_dir = wp_upload_dir();
            if (!empty($upload_dir['error'])) {
                return array(
                    'success' => false,
                    'message' => 'مشکل در دسترسی به مسیر آپلودها: ' . $upload_dir['error'],
                );
            }

            $filename = 'webtanan-order-export-' . date('Ymd-His') . '.csv';
            $filepath = trailingslashit($upload_dir['basedir']) . $filename;
            $fileurl = trailingslashit($upload_dir['baseurl']) . $filename;

            // UTF-8 BOM for proper Persian text display in Excel.
            $bom = "\xEF\xBB\xBF";

            $written = file_put_contents($filepath, $bom . implode(PHP_EOL, $output));
            if ($written === false) {
                return array(
                    'success' => false,
                    'message' => 'خطا در ساخت فایل خروجی.',
                );
            }

            return array(
                'success' => true,
                'count' => count($output),
                'url' => $fileurl,
            );
        }
    }

    Webtanan_Export_Mobiles_Plugin::bootstrap();
}
