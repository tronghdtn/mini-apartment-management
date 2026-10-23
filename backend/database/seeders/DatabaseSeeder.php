<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     *
     * Chỉ danh mục hệ thống đã duyệt, không tạo user hoặc dữ liệu nghiệp vụ mẫu.
     */
    public function run(): void
    {
        $this->call(SystemCatalogSeeder::class);
    }
}
