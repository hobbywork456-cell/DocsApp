import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import TitleIcon from '@mui/icons-material/Title';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import ViewWeekIcon from '@mui/icons-material/ViewWeek';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import ViewAgendaIcon from '@mui/icons-material/ViewAgenda';
import TableChartIcon from '@mui/icons-material/TableChart';
import PermMediaIcon from '@mui/icons-material/PermMedia';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import { SLIDE_LAYOUTS } from './presentationConstants';

const LAYOUT_ICONS = {
  title: TitleIcon,
  bullets: FormatListBulletedIcon,
  'two-column': ViewColumnIcon,
  'three-column': ViewWeekIcon,
  metric: TrendingUpIcon,
  quote: FormatQuoteIcon,
  section: ViewAgendaIcon,
  comparison: TableChartIcon,
  media: PermMediaIcon,
  blank: CropSquareIcon
};

const SlideLayoutDialog = ({
  open,
  onClose,
  onSelectLayout,
  currentLayoutId = 'title',
  title = 'Select Slide Layout'
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          className: 'slide-layout-dialog-paper'
        }
      }}
    >
      <DialogTitle className="layout-dialog-title">
        <Typography variant="h6" className="layout-dialog-heading">
          {title}
        </Typography>
        <IconButton size="small" onClick={onClose} className="layout-dialog-close">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent className="layout-dialog-content">
        <Box className="layout-templates-grid">
          {SLIDE_LAYOUTS.map((layout) => {
            const IconComponent = LAYOUT_ICONS[layout.id] || TitleIcon;
            const isSelected = layout.id === currentLayoutId;

            return (
              <Box
                key={layout.id}
                className={`layout-card ${isSelected ? 'selected' : ''}`}
                onClick={() => {
                  onSelectLayout(layout.id);
                  onClose();
                }}
              >
                <Box className="layout-card-icon-area">
                  <IconComponent className="layout-card-icon" />
                </Box>
                <Typography variant="subtitle2" className="layout-card-name">
                  {layout.name}
                </Typography>
                <Typography variant="caption" className="layout-card-desc">
                  {layout.description}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default SlideLayoutDialog;
