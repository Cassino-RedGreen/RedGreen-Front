const GridSize = 5;

export const GetGambitCardCenter = (
  Box: { width: number; height: number },
  Index: number
) => {
  const Width = Math.round(Box.width);
  const Height = Math.round(Box.height);
  const BoardSize = Math.min(Width, Height);
  const BoardX = Math.round((Width - BoardSize) / 2);
  const BoardY = Math.round((Height - BoardSize) / 2);
  const OuterPadding = Math.max(12, Math.round(BoardSize * 0.055));
  const CellGap = Math.max(5, Math.round(BoardSize * 0.018));
  const AvailableSize = BoardSize - OuterPadding * 2;
  const CellSize = Math.floor(
    (AvailableSize - CellGap * (GridSize - 1)) / GridSize
  );
  const GridPixels = CellSize * GridSize + CellGap * (GridSize - 1);
  const GridX = Math.round(BoardX + (BoardSize - GridPixels) / 2);
  const GridY = Math.round(BoardY + (BoardSize - GridPixels) / 2);
  const Row = Math.floor(Index / GridSize);
  const Column = Index % GridSize;

  return {
    x: GridX + Column * (CellSize + CellGap) + CellSize / 2,
    y: GridY + Row * (CellSize + CellGap) + CellSize / 2,
  };
};
