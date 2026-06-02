import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const items = await prisma.portfolioItem.findMany({
      orderBy: { buyDate: 'desc' }
    });
    return NextResponse.json(items);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate buyDate
    const buyDate = new Date(body.buyDate);
    if (isNaN(buyDate.getTime())) {
      return NextResponse.json({ error: 'Ngày mua không hợp lệ.' }, { status: 400 });
    }

    // Validate quantity
    const quantity = Number(body.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      return NextResponse.json({ error: 'Số chỉ phải là số dương hợp lệ.' }, { status: 400 });
    }

    // Validate buyPrice
    const buyPrice = Number(body.buyPrice);
    if (isNaN(buyPrice) || buyPrice <= 0) {
      return NextResponse.json({ error: 'Giá mua phải là số dương hợp lệ.' }, { status: 400 });
    }

    // Validate sellPrice
    let sellPrice: number | null = null;
    if (body.sellPrice !== undefined && body.sellPrice !== null && body.sellPrice !== '') {
      sellPrice = Number(body.sellPrice);
      if (isNaN(sellPrice) || sellPrice <= 0) {
        return NextResponse.json({ error: 'Giá bán phải là số dương hợp lệ.' }, { status: 400 });
      }
    }

    const item = await prisma.portfolioItem.create({
      data: {
        buyDate,
        quantity,
        buyPrice,
        status: body.status || 'Đang giữ',
        sellPrice
      }
    });
    return NextResponse.json(item);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...data } = body;
    
    const parsedId = Number(id);
    if (!id || isNaN(parsedId)) {
      return NextResponse.json({ error: 'ID không hợp lệ.' }, { status: 400 });
    }

    // Validate optional updates
    if (data.buyDate !== undefined) {
      data.buyDate = new Date(data.buyDate);
      if (isNaN(data.buyDate.getTime())) {
        return NextResponse.json({ error: 'Ngày mua không hợp lệ.' }, { status: 400 });
      }
    }

    if (data.quantity !== undefined) {
      data.quantity = Number(data.quantity);
      if (isNaN(data.quantity) || data.quantity <= 0) {
        return NextResponse.json({ error: 'Số chỉ phải là số dương hợp lệ.' }, { status: 400 });
      }
    }

    if (data.buyPrice !== undefined) {
      data.buyPrice = Number(data.buyPrice);
      if (isNaN(data.buyPrice) || data.buyPrice <= 0) {
        return NextResponse.json({ error: 'Giá mua phải là số dương hợp lệ.' }, { status: 400 });
      }
    }

    if (data.sellPrice !== undefined) {
      if (data.sellPrice === null || data.sellPrice === '') {
        data.sellPrice = null;
      } else {
        data.sellPrice = Number(data.sellPrice);
        if (isNaN(data.sellPrice) || data.sellPrice <= 0) {
          return NextResponse.json({ error: 'Giá bán phải là số dương hợp lệ.' }, { status: 400 });
        }
      }
    }

    const item = await prisma.portfolioItem.update({
      where: { id: parsedId },
      data
    });
    return NextResponse.json(item);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const parsedId = Number(id);
    if (!id || isNaN(parsedId)) return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });

    await prisma.portfolioItem.delete({
      where: { id: parsedId }
    });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
